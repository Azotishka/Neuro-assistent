package com.neuroassistant.app.studio

import android.content.Context
import android.net.Uri
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.InetAddress
import java.net.URI
import java.net.URL
import java.util.Locale
import org.json.JSONArray
import org.json.JSONObject

data class StudioChunk(val id:String,val source:String,val text:String,val score:Double=0.0)

class StudioIntegration(context: Context) {
    private val prefs=context.getSharedPreferences("neuro_studio_rag", Context.MODE_PRIVATE)
    private val maxDocuments=80
    private val maxChars=180_000
    private val chunkSize=1200
    private val chunkOverlap=160

    @Synchronized fun indexText(source:String,text:String):Int {
        val clean=clean(text)
        require(source.isNotBlank()){"Источник не указан"}
        require(clean.isNotBlank()){"Документ пуст"}
        require(clean.length<=maxChars){"Документ слишком большой"}
        val chunks=chunk(clean).mapIndexed { i,s -> StudioChunk("${source.hashCode()}-$i",source,s) }
        val current=load().filterNot { it.source==source }.toMutableList()
        current += chunks
        while(current.size>maxDocuments) current.removeAt(0)
        save(current)
        return chunks.size
    }

    @Synchronized fun search(query:String,limit:Int=6):List<StudioChunk> {
        val terms=tokenize(query)
        if(terms.isEmpty()) return emptyList()
        return load().map { c ->
            val body=tokenize(c.text)
            val score=terms.sumOf { t -> if(body.contains(t)) 1.0 + (if(c.text.lowercase(Locale.ROOT).contains(t)) .2 else 0.0) else 0.0 } / terms.size
            c.copy(score=score)
        }.filter { it.score>0 }.sortedByDescending { it.score }.take(limit.coerceIn(1,12))
    }

    fun fetchUrl(raw:String):JSONObject {
        val uri=validateUrl(raw)
        val connection=(URL(uri.toString()).openConnection() as HttpURLConnection).apply {
            connectTimeout=8000; readTimeout=12000; instanceFollowRedirects=false
            requestMethod="GET"; setRequestProperty("User-Agent","NeuroAssistant-Studio/1.0")
        }
        return try {
            val code=connection.responseCode
            require(code in 200..299){"HTTP $code"}
            val type=connection.contentType.orEmpty().lowercase(Locale.ROOT)
            require(type.isBlank() || type.contains("text") || type.contains("json") || type.contains("xml")){"Разрешены только текстовые web-ресурсы"}
            val text=BufferedReader(InputStreamReader(connection.inputStream,Charsets.UTF_8)).use { it.readText().take(maxChars) }
            val n=indexText(uri.toString(),stripHtml(text))
            JSONObject().put("url",uri.toString()).put("status",code).put("chunks",n).put("chars",text.length)
        } finally { connection.disconnect() }
    }

    fun summary():JSONObject=JSONObject().put("chunks",load().size).put("sources",JSONArray(load().map{it.source}.distinct())).put("maxDocuments",maxDocuments)

    @Synchronized fun clear(){prefs.edit().remove("chunks").apply()}

    private fun load():List<StudioChunk> = runCatching {
        val a=JSONArray(prefs.getString("chunks","[]"))
        List(a.length()){i -> val o=a.getJSONObject(i); StudioChunk(o.getString("id"),o.getString("source"),o.getString("text"))}
    }.getOrDefault(emptyList())

    private fun save(items:List<StudioChunk>){
        val a=JSONArray()
        items.forEach { a.put(JSONObject().put("id",it.id).put("source",it.source).put("text",it.text)) }
        prefs.edit().putString("chunks",a.toString()).apply()
    }

    private fun validateUrl(raw:String):URI {
        val uri=URI(raw.trim())
        require(uri.scheme.equals("https",true)){"Разрешён только HTTPS"}
        require(uri.userInfo==null && uri.query==null && uri.fragment==null){"URL содержит запрещённые компоненты"}
        val host=uri.host?.lowercase(Locale.ROOT) ?: error("Некорректный host")
        require(host!="localhost" && host!="127.0.0.1" && !host.startsWith("10.") && !host.startsWith("192.168.") && !host.startsWith("169.254.")){"Локальные адреса запрещены"}
        val addresses=InetAddress.getAllByName(host)
        require(addresses.isNotEmpty() && addresses.all { !it.isAnyLocalAddress && !it.isLoopbackAddress && !it.isLinkLocalAddress }){"Адрес указывает на локальную сеть"}
        return uri
    }

    private fun clean(s:String)=s.replace(Regex("\\s+")," ").trim()
    private fun stripHtml(s:String)=s.replace(Regex("<script[\\s\\S]*?</script>","IGNORE_CASE")," ").replace(Regex("<style[\\s\\S]*?</style>","IGNORE_CASE")," ").replace(Regex("<[^>]+>")," ")
    private fun chunk(s:String):List<String>{ val out=mutableListOf<String>(); var start=0; while(start<s.length){ val end=minOf(start+chunkSize,s.length); out+=s.substring(start,end).trim(); if(end==s.length) break; start=maxOf(end-chunkOverlap,start+1) }; return out.filter{it.isNotBlank()} }
    private fun tokenize(s:String)=Regex("[\\p{L}\\p{Nd}]{3,}").findAll(s.lowercase(Locale.ROOT)).map{it.value}.toSet()
}
