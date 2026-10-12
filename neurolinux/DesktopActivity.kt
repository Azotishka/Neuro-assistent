package id.or.oo.pr

import android.app.Activity
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.core.view.WindowCompat
import id.or.oo.pr.engine.ProotLauncher
import java.nio.charset.StandardCharsets
import kotlin.concurrent.thread

/**
 * Rootless Linux desktop for Debian/Ubuntu root filesystems.
 *
 * The desktop packages are installed into the selected guest distribution,
 * never into Android itself. VNC is bound to loopback only and shown in an
 * embedded noVNC WebView.
 */
class DesktopActivity : ComponentActivity() {
    private var session: ProotLauncher.Session? = null
    private var readerThread: Thread? = null
    @Volatile private var desktopStarted = false
    @Volatile private var stopping = false

    private lateinit var statusView: TextView
    private lateinit var logView: TextView
    private lateinit var logScroll: ScrollView
    private lateinit var webView: WebView

    private val outputLock = Any()
    private val outputBuffer = StringBuilder()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, true)
        window.statusBarColor = Color.rgb(11, 18, 32)
        window.navigationBarColor = Color.rgb(11, 18, 32)

        val distro = intent.getStringExtra("distro")
        if (distro.isNullOrBlank()) {
            finish()
            return
        }

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.rgb(11, 18, 32))
        }

        val header = TextView(this).apply {
            text = "NeuroLinux OS  •  Рабочий стол"
            textSize = 19f
            setTextColor(Color.WHITE)
            setPadding(dp(16), dp(16), dp(16), dp(12))
            setBackgroundColor(Color.rgb(17, 24, 39))
        }
        root.addView(header, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ))

        statusView = TextView(this).apply {
            text = "Подготовка графической среды…"
            textSize = 14f
            setTextColor(Color.rgb(153, 246, 228))
            setPadding(dp(16), dp(12), dp(16), dp(12))
        }
        root.addView(statusView, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ))

        logView = TextView(this).apply {
            textSize = 12f
            typeface = android.graphics.Typeface.MONOSPACE
            setTextColor(Color.rgb(226, 232, 240))
            setPadding(dp(12), dp(8), dp(12), dp(16))
            text = "Первый запуск установит XFCE, VNC и noVNC в выбранный Linux-дистрибутив.\n" +
                "Нужны интернет и свободное место. Не закрывай экран во время установки.\n\n"
        }
        logScroll = ScrollView(this).apply {
            addView(logView)
            isFillViewport = true
        }
        root.addView(logScroll, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f
        ))

        webView = WebView(this).apply {
            visibility = View.GONE
            setBackgroundColor(Color.rgb(11, 18, 32))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.useWideViewPort = true
            settings.loadWithOverviewMode = true
            settings.setSupportZoom(false)
            settings.builtInZoomControls = false
            settings.displayZoomControls = false
            webViewClient = WebViewClient()
            webChromeClient = WebChromeClient()
        }
        root.addView(webView, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f
        ))

        setContentView(root)
        startDesktop(distro)
    }

    private fun startDesktop(distro: String) {
        statusView.text = "Подключение к Linux: " + distro
        val launcher = ProotLauncher(application as App)
        val startedSession = launcher.startSession(distro, user = "root", rows = 40, cols = 140)
        if (startedSession == null) {
            statusView.text = "Не удалось запустить Linux-сессию."
            appendLog("\nОшибка: среда " + distro + " не установлена или не запускается.\n")
            return
        }
        session = startedSession

        readerThread = thread(name = "neurolinux-desktop-pty") {
            val bytes = ByteArray(8192)
            while (!stopping && !startedSession.closed) {
                val count = try {
                    startedSession.read(bytes)
                } catch (_: Exception) {
                    break
                }
                if (count <= 0) break
                val chunk = String(bytes, 0, count, StandardCharsets.UTF_8)
                consumeOutput(chunk)
            }
        }

        // Let the initial login shell finish starting before sending the setup script.
        thread(name = "neurolinux-desktop-launch") {
            Thread.sleep(900)
            if (!stopping && !startedSession.closed) {
                startedSession.write(SETUP_COMMAND.toByteArray(StandardCharsets.UTF_8))
            }
        }
    }

    private fun consumeOutput(chunk: String) {
        val captured: String
        synchronized(outputLock) {
            outputBuffer.append(chunk)
            if (outputBuffer.length > 16000) {
                outputBuffer.delete(0, outputBuffer.length - 16000)
            }
            captured = outputBuffer.toString()
        }

        if (captured.contains(READY_MARKER) && !desktopStarted) {
            desktopStarted = true
            runOnUiThread {
                statusView.text = "XFCE запущен · сенсорное управление и клавиатура доступны"
                logScroll.visibility = View.GONE
                webView.visibility = View.VISIBLE
                webView.loadUrl(
                    "http://127.0.0.1:6080/vnc.html?autoconnect=true&resize=scale&reconnect=true"
                )
            }
            return
        }

        if (captured.contains(UNSUPPORTED_MARKER)) {
            runOnUiThread {
                statusView.text = "Для рабочего стола нужен Debian или Ubuntu."
                updateLog(captured)
            }
            return
        }

        if (captured.contains(FAILED_MARKER)) {
            runOnUiThread {
                statusView.text = "Запуск не завершён. Подробности ниже."
                updateLog(captured)
            }
            return
        }

        runOnUiThread {
            if (!desktopStarted) updateLog(captured)
        }
    }

    private fun appendLog(text: String) {
        synchronized(outputLock) {
            outputBuffer.append(text)
        }
        updateLog(outputBuffer.toString())
    }

    private fun updateLog(raw: String) {
        // Remove common ANSI terminal sequences from apt/VNC output.
        val clean = raw.replace(Regex("\u001B\\[[;\\d?]*[ -/]*[@-~]"), "")
        logView.text = clean.takeLast(9000)
        logScroll.post { logScroll.fullScroll(View.FOCUS_DOWN) }
    }

    override fun onDestroy() {
        stopping = true
        val oldSession = session
        session = null
        if (isFinishing && oldSession != null && !oldSession.closed) {
            thread(name = "neurolinux-desktop-stop") {
                try {
                    oldSession.write(
                        "vncserver -kill :1 >/dev/null 2>&1; pkill -x websockify >/dev/null 2>&1; exit\n"
                            .toByteArray(StandardCharsets.UTF_8)
                    )
                    Thread.sleep(250)
                } catch (_: Exception) {
                } finally {
                    try {
                        oldSession.close()
                    } catch (_: Exception) {
                    }
                }
            }
        } else {
            try {
                oldSession?.close()
            } catch (_: Exception) {
            }
        }
        if (::webView.isInitialized) {
            webView.stopLoading()
            webView.destroy()
        }
        super.onDestroy()
    }

    private fun dp(value: Int): Int =
        (value * resources.displayMetrics.density).toInt()

    companion object {
        private const val READY_MARKER = "__NEUROLINUX_DESKTOP_READY__"
        private const val UNSUPPORTED_MARKER = "__NEUROLINUX_DESKTOP_UNSUPPORTED__"
        private const val FAILED_MARKER = "__NEUROLINUX_DESKTOP_FAILED__"

        private val SETUP_COMMAND = """
cat > /tmp/neurolinux-start-desktop.sh <<'NEUROLINUX_SCRIPT'
#!/bin/sh
set +e
if ! command -v apt-get >/dev/null 2>&1; then
  echo "$UNSUPPORTED_MARKER"
  exit 0
fi
export DEBIAN_FRONTEND=noninteractive
echo "[1/4] Обновление списка пакетов…"
if ! apt-get update; then
  echo "Не удалось обновить список пакетов. Проверь интернет."
  echo "$FAILED_MARKER"
  exit 0
fi
echo "[2/4] Установка XFCE, VNC и noVNC (может занять несколько минут)…"
if ! apt-get install -y xfce4 xfce4-terminal tigervnc-standalone-server dbus-x11 novnc websockify procps; then
  echo "Не удалось установить графическую среду."
  echo "$FAILED_MARKER"
  exit 0
fi
echo "[3/4] Настройка графического сеанса…"
mkdir -p "$HOME/.vnc"
cat > "$HOME/.vnc/xstartup" <<'NEUROLINUX_XSTARTUP'
#!/bin/sh
unset SESSION_MANAGER
unset DBUS_SESSION_BUS_ADDRESS
export XDG_RUNTIME_DIR=/tmp/runtime-root
mkdir -p "$XDG_RUNTIME_DIR"
chmod 700 "$XDG_RUNTIME_DIR"
exec dbus-launch --exit-with-session startxfce4
NEUROLINUX_XSTARTUP
chmod 700 "$HOME/.vnc/xstartup"
(vncserver -kill :1 >/dev/null 2>&1 || true)
vncserver :1 -localhost yes -geometry 1280x800 -depth 24 -SecurityTypes None -xstartup "$HOME/.vnc/xstartup" >/tmp/neurolinux-vnc.log 2>&1
if ! vncserver -list 2>&1 | grep -q ':1'; then
  cat /tmp/neurolinux-vnc.log
  echo "Не удалось запустить VNC-сервер."
  echo "$FAILED_MARKER"
  exit 0
fi
echo "[4/4] Запуск безопасного локального WebSocket-моста…"
nohup websockify --web=/usr/share/novnc --host=127.0.0.1 6080 127.0.0.1:5901 >/tmp/neurolinux-websockify.log 2>&1 &
WEB_PID=$!
sleep 2
if kill -0 "$WEB_PID" 2>/dev/null; then
  echo "$READY_MARKER"
else
  cat /tmp/neurolinux-websockify.log
  echo "Не удалось запустить noVNC."
  echo "$FAILED_MARKER"
fi
NEUROLINUX_SCRIPT
sh /tmp/neurolinux-start-desktop.sh
""".trimIndent() + "\n"
    }
}
