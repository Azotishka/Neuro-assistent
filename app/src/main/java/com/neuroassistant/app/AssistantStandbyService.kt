package com.neuroassistant.app
import android.app.*
import android.content.Intent
import android.os.IBinder

class AssistantStandbyService : Service() {
    override fun onBind(intent: Intent?): IBinder? = null
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if(intent?.action == "STOP") { stopForeground(STOP_FOREGROUND_REMOVE); stopSelf(); return START_NOT_STICKY }
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(NotificationChannel("standby", "Помощник в ожидании", NotificationManager.IMPORTANCE_LOW))
        val launch = PendingIntent.getActivity(this, 0, Intent(this, LocalModelsActivity::class.java).putExtra(MainActivity.EXTRA_START_VOICE, true), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val stop = PendingIntent.getService(this, 1, Intent(this, AssistantStandbyService::class.java).setAction("STOP"), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val notification = Notification.Builder(this, "standby").setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setContentTitle("NeuroAssistant готов к вызову").setContentText("Нажми для голосового запроса. Микрофон не прослушивается.")
            .setContentIntent(launch).setOngoing(true).addAction(Notification.Action.Builder(null, "Выключить", stop).build()).build()
        startForeground(8, notification)
        return START_NOT_STICKY
    }
}
