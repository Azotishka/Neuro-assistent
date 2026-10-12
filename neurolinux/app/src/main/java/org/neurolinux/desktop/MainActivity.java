package org.neurolinux.desktop;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

public class MainActivity extends Activity {
    private static final int BG = 0xFF0A1018;
    private static final int CARD = 0xFF121D29;
    private static final int CARD_ALT = 0xFF182536;
    private static final int TEXT = 0xFFF2F6FB;
    private static final int MUTED = 0xFF9CAFC1;
    private static final int ACCENT = 0xFF66E3CE;
    private static final int BLUE = 0xFF77A9FF;

    private static final String BASE_COMMAND =
        "pkg update -y && pkg upgrade -y && pkg install -y proot-distro x11-repo && pkg update -y && pkg install -y termux-x11-nightly && proot-distro install debian";
    private static final String DESKTOP_COMMAND =
        "proot-distro login debian -- bash -lc 'apt update && DEBIAN_FRONTEND=noninteractive apt install -y xfce4 xfce4-terminal thunar mousepad dbus-x11 git python3 python3-pip nodejs npm build-essential curl wget nano'";
    private static final String LAUNCHER_COMMAND =
        "mkdir -p ~/bin\n" +
        "cat > ~/bin/neuro-linux-start <<'NEURO_EOF'\n" +
        "#!/data/data/com.termux/files/usr/bin/bash\n" +
        "termux-x11 :1 >/dev/null 2>&1 &\n" +
        "sleep 2\n" +
        "am start --user 0 -n com.termux.x11/.MainActivity >/dev/null 2>&1 || true\n" +
        "proot-distro login debian --shared-tmp -- /bin/bash -lc 'export DISPLAY=:1; export XDG_RUNTIME_DIR=/tmp/runtime-root; mkdir -p \"$XDG_RUNTIME_DIR\"; chmod 700 \"$XDG_RUNTIME_DIR\"; exec dbus-launch --exit-with-session startxfce4'\n" +
        "NEURO_EOF\n" +
        "chmod +x ~/bin/neuro-linux-start";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(BG);
        getWindow().setNavigationBarColor(BG);
        getWindow().getDecorView().setSystemUiVisibility(0);
        buildUi();
    }

    private void buildUi() {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(BG);

        LinearLayout outer = new LinearLayout(this);
        outer.setOrientation(LinearLayout.VERTICAL);
        outer.setPadding(dp(20), dp(14), dp(20), dp(32));
        outer.setGravity(Gravity.CENTER_HORIZONTAL);
        scroll.addView(outer, new ScrollView.LayoutParams(-1, -2));

        LinearLayout page = new LinearLayout(this);
        page.setOrientation(LinearLayout.VERTICAL);
        outer.addView(page, new LinearLayout.LayoutParams(-1, -2));

        LinearLayout top = new LinearLayout(this);
        top.setGravity(Gravity.CENTER_VERTICAL);
        top.setPadding(0, dp(8), 0, dp(18));
        TextView mark = text("N", 27, BG, true);
        mark.setGravity(Gravity.CENTER);
        mark.setBackground(round(ACCENT, 16));
        top.addView(mark, new LinearLayout.LayoutParams(dp(56), dp(56)));

        LinearLayout brand = new LinearLayout(this);
        brand.setOrientation(LinearLayout.VERTICAL);
        brand.setPadding(dp(14), 0, 0, 0);
        brand.addView(text("NeuroLinux OS", 24, TEXT, true));
        TextView sub = text("ROOTLESS LINUX WORKSPACE", 11, MUTED, true);
        sub.setLetterSpacing(0.08f);
        LinearLayout.LayoutParams subLp = new LinearLayout.LayoutParams(-2, -2);
        subLp.topMargin = dp(4);
        brand.addView(sub, subLp);
        top.addView(brand, new LinearLayout.LayoutParams(0, -2, 1));
        TextView version = text("ALPHA 0.1", 11, ACCENT, true);
        version.setPadding(dp(12), dp(8), dp(12), dp(8));
        version.setBackground(round(0xFF173B3B, 99));
        top.addView(version);
        page.addView(top);

        LinearLayout hero = card(CARD_ALT);
        hero.setPadding(dp(20), dp(22), dp(20), dp(22));
        TextView overline = text("XIAOMI PAD 7 PRO  /  ANDROID " + Build.VERSION.RELEASE, 11, ACCENT, true);
        overline.setLetterSpacing(0.05f);
        hero.addView(overline);
        TextView headline = text("Твой Linux.\nТвой рабочий стол.", 30, TEXT, true);
        headline.setLineSpacing(dp(2), 1f);
        LinearLayout.LayoutParams hlp = new LinearLayout.LayoutParams(-1, -2);
        hlp.topMargin = dp(13);
        hero.addView(headline, hlp);
        TextView desc = text("Debian ARM64 без root — для программирования, файлов, сайтов и локальных инструментов ИИ.", 15, MUTED, false);
        desc.setLineSpacing(dp(4), 1f);
        LinearLayout.LayoutParams dlp = new LinearLayout.LayoutParams(-1, -2);
        dlp.topMargin = dp(10);
        hero.addView(desc, dlp);
        page.addView(hero);

        section(page, "01  ·  ПОДГОТОВКА", "Установи официальные компоненты. NeuroLinux не меняет прошивку и не заменяет Android.");
        actionCard(page, "A", "Termux", "Терминал Android, внутри которого будет храниться Debian.", "Открыть официальный Termux", BLUE,
            v -> openUrl("https://github.com/termux/termux-app/releases/latest"));
        actionCard(page, "B", "Termux:X11", "Понадобится Android-приложение X11 и пакет termux-x11-nightly внутри Termux.", "Открыть релиз Termux:X11", ACCENT,
            v -> openUrl("https://github.com/termux/termux-x11/releases/tag/nightly"));
        note(page, "Важно про подписи APK", "Termux и дополнения должны быть из совместимых источников. Скачивай Termux и Termux:X11 с официальных GitHub-релизов, чтобы избежать конфликта подписи.");

        section(page, "02  ·  СОЗДАНИЕ LINUX", "Нажми кнопку: команда скопируется, затем откроется Termux. Вставь её в окно терминала и дождись завершения.");
        commandCard(page, "01", "Развернуть Debian ARM64", "Обновляет пакеты, устанавливает PRoot и компоненты X11, затем загружает Debian. Первый шаг требует интернета.", BASE_COMMAND);
        commandCard(page, "02", "Установить рабочий стол и инструменты", "Устанавливает XFCE, файловый менеджер, редактор, Python, Node.js, Git и компилятор. Загрузка займёт время.", DESKTOP_COMMAND);
        commandCard(page, "03", "Создать команду запуска", "Создаёт скрипт для запуска X11 и рабочего стола XFCE.", LAUNCHER_COMMAND);
        commandCard(page, "04", "Запустить NeuroLinux Desktop", "Когда три шага выше выполнены, выполни эту команду в Termux.", "~/bin/neuro-linux-start");

        LinearLayout limits = card(CARD);
        limits.setPadding(dp(16), dp(16), dp(16), dp(16));
        limits.addView(text("Что важно знать", 16, TEXT, true));
        TextView limitText = text("Это Linux-окружение внутри Android, а не отдельное ядро Linux. Root не нужен. Системные службы, драйверы, GPU/NPU-ускорение и некоторые desktop-приложения могут быть недоступны. Для долгих сборок сними ограничения батареи для Termux.", 13, MUTED, false);
        limitText.setLineSpacing(dp(4), 1f);
        LinearLayout.LayoutParams llp = new LinearLayout.LayoutParams(-1, -2);
        llp.topMargin = dp(8);
        limits.addView(limitText, llp);
        addCard(page, limits);

        Button open = button("Открыть Termux", ACCENT, BG);
        open.setOnClickListener(v -> launchTermux());
        page.addView(open, fullWidth());
        TextView footer = text("NeuroLinux OS 0.1  ·  Debian ARM64 + PRoot + XFCE", 12, MUTED, false);
        footer.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams flp = new LinearLayout.LayoutParams(-1, -2);
        flp.topMargin = dp(20);
        page.addView(footer, flp);

        setContentView(scroll);
    }

    private void section(LinearLayout parent, String title, String subtitle) {
        LinearLayout block = new LinearLayout(this);
        block.setOrientation(LinearLayout.VERTICAL);
        TextView t = text(title, 12, ACCENT, true);
        t.setLetterSpacing(0.07f);
        block.addView(t);
        TextView s = text(subtitle, 14, MUTED, false);
        s.setLineSpacing(dp(3), 1f);
        LinearLayout.LayoutParams slp = new LinearLayout.LayoutParams(-1, -2);
        slp.topMargin = dp(7);
        block.addView(s, slp);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, -2);
        lp.topMargin = dp(25);
        lp.bottomMargin = dp(13);
        parent.addView(block, lp);
    }

    private void actionCard(LinearLayout parent, String number, String title, String desc, String label, int accent, View.OnClickListener click) {
        LinearLayout c = card(CARD);
        rowTitle(c, number, title, accent);
        addDescription(c, desc);
        Button b = button(label, CARD_ALT, TEXT);
        b.setOnClickListener(click);
        LinearLayout.LayoutParams lp = fullWidth();
        lp.topMargin = dp(13);
        c.addView(b, lp);
        addCard(parent, c);
    }

    private void commandCard(LinearLayout parent, String number, String title, String desc, String command) {
        LinearLayout c = card(CARD);
        rowTitle(c, number, title, ACCENT);
        addDescription(c, desc);
        TextView commandPreview = text(command.replace('\n', ' '), 11, 0xFFD3E0EC, false);
        commandPreview.setTypeface(Typeface.MONOSPACE);
        commandPreview.setMaxLines(2);
        commandPreview.setEllipsize(android.text.TextUtils.TruncateAt.END);
        commandPreview.setPadding(dp(11), dp(10), dp(11), dp(10));
        commandPreview.setBackground(round(0xFF0B131D, 10));
        LinearLayout.LayoutParams cp = new LinearLayout.LayoutParams(-1, -2);
        cp.topMargin = dp(12);
        c.addView(commandPreview, cp);
        Button b = button("Копировать и открыть Termux", ACCENT, BG);
        b.setOnClickListener(v -> {
            ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
            clipboard.setPrimaryClip(ClipData.newPlainText("NeuroLinux command", command));
            Toast.makeText(this, "Команда скопирована. Вставь её в Termux.", Toast.LENGTH_LONG).show();
            launchTermux();
        });
        LinearLayout.LayoutParams bp = fullWidth();
        bp.topMargin = dp(12);
        c.addView(b, bp);
        addCard(parent, c);
    }

    private void rowTitle(LinearLayout parent, String number, String title, int accent) {
        LinearLayout row = new LinearLayout(this);
        row.setGravity(Gravity.CENTER_VERTICAL);
        TextView n = text(number, 12, accent, true);
        n.setGravity(Gravity.CENTER);
        n.setBackground(round(0xFF203142, 10));
        row.addView(n, new LinearLayout.LayoutParams(dp(38), dp(36)));
        TextView t = text(title, 17, TEXT, true);
        LinearLayout.LayoutParams tlp = new LinearLayout.LayoutParams(0, -2, 1);
        tlp.leftMargin = dp(12);
        row.addView(t, tlp);
        parent.addView(row);
    }

    private void addDescription(LinearLayout parent, String value) {
        TextView d = text(value, 14, MUTED, false);
        d.setLineSpacing(dp(3), 1f);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, -2);
        lp.topMargin = dp(10);
        parent.addView(d, lp);
    }

    private void note(LinearLayout parent, String title, String body) {
        LinearLayout c = card(0xFF2A271B);
        c.addView(text(title, 14, 0xFFFFD37A, true));
        TextView b = text(body, 13, 0xFFE0D6BC, false);
        b.setLineSpacing(dp(3), 1f);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, -2);
        lp.topMargin = dp(5);
        c.addView(b, lp);
        addCard(parent, c);
    }

    private LinearLayout card(int color) {
        LinearLayout c = new LinearLayout(this);
        c.setOrientation(LinearLayout.VERTICAL);
        c.setPadding(dp(16), dp(16), dp(16), dp(16));
        c.setBackground(round(color, 16));
        return c;
    }

    private void addCard(LinearLayout parent, LinearLayout c) {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, -2);
        lp.bottomMargin = dp(12);
        parent.addView(c, lp);
    }

    private TextView text(String value, float size, int color, boolean bold) {
        TextView t = new TextView(this);
        t.setText(value);
        t.setTextSize(size);
        t.setTextColor(color);
        if (bold) t.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        return t;
    }

    private Button button(String label, int background, int foreground) {
        Button b = new Button(this);
        b.setText(label);
        b.setTextSize(13);
        b.setTextColor(foreground);
        b.setAllCaps(false);
        b.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        b.setPadding(dp(12), dp(7), dp(12), dp(7));
        b.setBackground(round(background, 12));
        b.setMinHeight(dp(48));
        b.setStateListAnimator(null);
        return b;
    }

    private LinearLayout.LayoutParams fullWidth() {
        return new LinearLayout.LayoutParams(-1, -2);
    }

    private GradientDrawable round(int color, int radiusDp) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(color);
        d.setCornerRadius(dp(radiusDp));
        return d;
    }

    private int dp(float value) {
        return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
    }

    private void launchTermux() {
        try {
            Intent launch = getPackageManager().getLaunchIntentForPackage("com.termux");
            if (launch != null) {
                launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(launch);
            } else {
                Toast.makeText(this, "Сначала установи Termux по ссылке выше.", Toast.LENGTH_LONG).show();
                openUrl("https://github.com/termux/termux-app/releases/latest");
            }
        } catch (Exception e) {
            Toast.makeText(this, "Не удалось открыть Termux.", Toast.LENGTH_LONG).show();
        }
    }

    private void openUrl(String url) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (Exception e) {
            Toast.makeText(this, "Не удалось открыть ссылку.", Toast.LENGTH_SHORT).show();
        }
    }
}
