package com.azotishka.ashencircuit;

import android.content.Context;
import android.graphics.*;
import android.os.SystemClock;
import android.os.Vibrator;
import android.os.VibrationEffect;
import android.view.*;
import java.util.*;

public final class GameView extends View {
    private static final float DT = 1f / 60f;
    private final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint text = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final ArrayList<Bullet> bullets = new ArrayList<>();
    private final ArrayList<Particle> particles = new ArrayList<>();
    private final Vibrator vibrator;
    private long lastNanos;
    private double accumulator;
    private float sx=1, sy=1, w,h;
    private final Player hero = new Player();
    private final Enemy enemy = new Enemy();
    private boolean left,right,jump,roll,attack,shoot;
    private boolean dead;
    private float shake, time;

    public GameView(Context c) {
        super(c);
        vibrator = (Vibrator)c.getSystemService(Context.VIBRATOR_SERVICE);
        text.setTypeface(Typeface.create(Typeface.MONOSPACE, Typeface.BOLD));
        setFocusable(true);
        lastNanos = System.nanoTime();
    }

    @Override protected void onDraw(Canvas c) {
        super.onDraw(c);
        w=getWidth(); h=getHeight();
        float scale=Math.min(w/1280f,h/720f);
        sx=scale; sy=scale;
        double now=System.nanoTime();
        double frame=Math.min(0.1,(now-lastNanos)/1e9);
        lastNanos=(long)now;
        accumulator += frame;
        while(accumulator>=DT){ update(DT); accumulator-=DT; }
        drawWorld(c,scale);
        postInvalidateOnAnimation();
    }

    private void update(float dt) {
        time += dt;
        if(dead) { if(jump||attack||shoot||roll){ reset(); } clearEdges(); updateParticles(dt); return; }
        hero.update(dt);
        enemy.update(dt);
        updateBullets(dt);
        updateParticles(dt);
        if(shake>0) shake=Math.max(0,shake-dt*2.6f);
        clearEdges();
    }

    private void clearEdges(){ jump=false; roll=false; attack=false; shoot=false; }

    private void reset(){ hero.reset(); enemy.reset(); bullets.clear(); particles.clear(); dead=false; shake=0; vibrate(18); }

    private void drawWorld(Canvas c,float s) {
        float ox=(float)(Math.random()-0.5)*shake*16f*s, oy=(float)(Math.random()-0.5)*shake*16f*s;
        c.save(); c.translate(ox,oy);
        p.setStyle(Paint.Style.FILL); p.setColor(Color.rgb(11,12,17)); c.drawRect(0,0,w,h,p);
        // layered industrial skyline
        p.setColor(Color.rgb(18,20,28)); c.drawRect(0,h*0.44f,w,h,p);
        p.setColor(Color.rgb(29,30,38));
        for(int i=0;i<12;i++){ float bx=i*130*s; c.drawRect(bx,h*.32f+(i%3)*18*s,bx+70*s,h*.62f,p); }
        // platforms
        p.setColor(Color.rgb(69,61,58));
        rect(c, 60, 590, 1160, 40, s);
        rect(c, 250, 470, 270, 24, s);
        rect(c, 700, 390, 240, 24, s);
        rect(c, 970, 520, 180, 24, s);
        // hazard glow line
        p.setColor(Color.rgb(126,70,46)); rect(c,60,630,1160,5,s);
        // enemy and player
        enemy.draw(c,s); hero.draw(c,s);
        for(Bullet b:bullets)b.draw(c,s);
        for(Particle q:particles)q.draw(c,s);
        c.restore();
        drawHud(c,s);
        drawControls(c,s);
    }

    private void drawHud(Canvas c,float s){
        p.setColor(Color.argb(185,8,9,13)); rect(c,26,22,360,62,s);
        text.setTextSize(24*s); text.setColor(Color.WHITE);
        c.drawText("ASHEN CIRCUIT  •  VS1",42*s,58*s,text);
        text.setTextSize(18*s); text.setColor(Color.rgb(194,190,181));
        c.drawText("HP "+Math.max(0,hero.hp)+"   ENEMY "+Math.max(0,enemy.hp),42*s,82*s,text);
        if(dead){
            p.setColor(Color.argb(225,8,9,13)); c.drawRect(0,0,w,h,p);
            text.setTextAlign(Paint.Align.CENTER); text.setColor(Color.WHITE); text.setTextSize(46*s);
            c.drawText("CORE LOST",w/2f,h*.42f,text);
            text.setTextSize(20*s); text.setColor(Color.rgb(205,196,181));
            c.drawText("Tap JUMP / ATTACK / SHOOT / ROLL to restart",w/2f,h*.52f,text);
            text.setTextAlign(Paint.Align.LEFT);
        }
    }

    private void drawControls(Canvas c,float s){
        alphaCircle(c,110*s,h-110*s,58*s,Color.argb(95,255,255,255));
        alphaCircle(c,245*s,h-110*s,58*s,Color.argb(95,255,255,255));
        alphaCircle(c,w-305*s,h-105*s,52*s,Color.argb(100,160,190,230));
        alphaCircle(c,w-200*s,h-105*s,52*s,Color.argb(100,215,125,125));
        alphaCircle(c,w-95*s,h-105*s,52*s,Color.argb(100,215,190,110));
        alphaCircle(c,w-175*s,h-215*s,46*s,Color.argb(90,170,225,170));
        text.setColor(Color.WHITE); text.setTextSize(20*s); text.setTextAlign(Paint.Align.CENTER);
        c.drawText("←",110*s,h-103*s,text); c.drawText("→",245*s,h-103*s,text);
        c.drawText("R",w-305*s,h-98*s,text); c.drawText("A",w-200*s,h-98*s,text); c.drawText("S",w-95*s,h-98*s,text); c.drawText("J",w-175*s,h-208*s,text);
        text.setTextAlign(Paint.Align.LEFT);
    }

    private void updateBullets(float dt){
        for(int i=bullets.size()-1;i>=0;i--){
            Bullet b=bullets.get(i); b.x+=b.vx*dt; b.life-=dt;
            if(enemy.alive() && hit(b.x,b.y,enemy.x-24,enemy.y-64,48,64)){ enemy.hit(18); spawn(enemy.x,enemy.y-35,7); b.life=0; shake=.7f; }
            if(b.life<=0 || b.x<-50 || b.x>1330){ bullets.remove(i); }
        }
    }

    private boolean hit(float x,float y,float rx,float ry,float rw,float rh){ return x>=rx&&x<=rx+rw&&y>=ry&&y<=ry+rh; }

    private void spawn(float x,float y,int n){
        for(int i=0;i<n;i++) particles.add(new Particle(x,y,(float)(Math.random()*2-1)*120,-80-(float)Math.random()*130));
    }

    private void vibrate(long ms){
        if(vibrator==null || !vibrator.hasVibrator()) return;
        if(android.os.Build.VERSION.SDK_INT>=26) vibrator.vibrate(VibrationEffect.createOneShot(ms,VibrationEffect.DEFAULT_AMPLITUDE));
        else vibrator.vibrate(ms);
    }

    private void rect(Canvas c,float x,float y,float rw,float rh,float s){ c.drawRect(x*s,y*s,(x+rw)*s,(y+rh)*s,p); }
    private void alphaCircle(Canvas c,float x,float y,float r,int color){ p.setColor(color); p.setStyle(Paint.Style.FILL); c.drawCircle(x,y,r,p); }

    @Override public boolean onTouchEvent(android.view.MotionEvent e){
        int a=e.getActionMasked();
        if(a==MotionEvent.ACTION_DOWN||a==MotionEvent.ACTION_POINTER_DOWN||a==MotionEvent.ACTION_MOVE){
            int mask=0;
            for(int i=0;i<e.getPointerCount();i++){
                float x=e.getX(i)/sx, y=e.getY(i)/sy;
                if(y>h/sy-180){ if(x<180) left=true; else if(x<320) right=true; else if(x>w/sx-360&&x<w/sx-255) roll=true; else if(x>w/sx-255&&x<w/sx-145) attack=true; else if(x>w/sx-145) shoot=true; else if(x>w/sx-230&&y<h/sy-150) jump=true; }
            }
            return true;
        }
        if(a==MotionEvent.ACTION_UP||a==MotionEvent.ACTION_CANCEL){ left=right=false; return true; }
        return true;
    }

    private final class Player {
        float x=130,y=520,vx=0,vy=0,rollT=0,attackT=0,invT=0;
        int hp=100; boolean onGround;
        void reset(){x=130;y=520;vx=vy=rollT=attackT=invT=0;hp=100;}
        void update(float dt){
            boolean rolling=rollT>0, attacking=attackT>0;
            if(rollT>0)rollT-=dt;
            if(attackT>0)attackT-=dt;
            if(invT>0)invT-=dt;
            float accel=onGround?1200:800;
            if(!rolling){ if(left)vx-=accel*dt; if(right)vx+=accel*dt; if(!left&&!right)vx*=onGround?.80f:.96f; }
            vx=Math.max(-220,Math.min(220,vx));
            if(jump&&onGround){vy=-520;onGround=false;vibrate(10);}
            if(roll&&!rolling){rollT=.42f;invT=.42f;vx=(right?1:(left?-1:(vx<0?-1:1)))*430;vibrate(12);}
            if(attack&&!rolling&&!attacking){attackT=.28f;vibrate(10); if(enemy.alive()&&Math.abs(enemy.x-x)<95&&Math.abs(enemy.y-y)<90) enemy.hit(28);}
            if(shoot&&!rolling){bullets.add(new Bullet(x+(vx>=0?42:-42),y-35,(vx>=0?620:-620)));vibrate(6);}
            if(!onGround){vy+=1100*dt; if(vy>720)vy=720; y+=vy*dt;} else {y=520;}
            x+=vx*dt; x=Math.max(70,Math.min(1180,x));
            if(y>=520){y=520;vy=0;onGround=true;} else onGround=false;
            if(enemy.alive() && invT<=0 && Math.abs(enemy.x-x)<45 && Math.abs(enemy.y-y)<65){hp-=8;invT=.45f;shake=.9f;vibrate(22);spawn(x,y-30,5);if(hp<=0){dead=true;vibrate(80);}}
        }
        void draw(Canvas c,float s){
            p.setStyle(Paint.Style.FILL); p.setColor(invT>0?Color.rgb(220,220,240):Color.rgb(215,85,70));
            rect(c,x-18,y-60,36,60,s);
            p.setColor(Color.rgb(55,60,72)); rect(c,x-22,y-68,44,10,s);
            p.setColor(Color.rgb(235,204,160)); c.drawCircle(x*s,(y-78)*s,13*s,p);
            if(attackT>0){p.setColor(Color.argb(160,235,235,220)); c.drawCircle((x+(vx>=0?52:-52))*s,(y-38)*s,18*s,p);}
        }
    }

    private final class Enemy {
        float x=850,y=520,vx=0,hitT=0; int hp=120; boolean dead;
        void reset(){x=850;y=520;vx=0;hitT=0;hp=120;dead=false;}
        boolean alive(){return !dead;}
        void update(float dt){ if(dead)return; float dir=hero.x<x?-1:1; vx+=dir*420*dt; vx=Math.max(-105,Math.min(105,vx)); x+=vx*dt; if(x<700)x=700;if(x>1120)x=1120; if(hitT>0)hitT-=dt; if(Math.abs(hero.x-x)<48 && hero.invT<=0){vx*=.7f;} }
        void hit(int dmg){hp-=dmg;hitT=.12f;spawn(x,y-35,6);shake=.65f;if(hp<=0){dead=true;spawn(x,y-25,18);vibrate(35);}}
        void draw(Canvas c,float s){ if(dead)return; p.setColor(hitT>0?Color.WHITE:Color.rgb(82,111,128)); rect(c,x-24,y-64,48,64,s);p.setColor(Color.rgb(189,96,78));c.drawCircle(x*s,(y-78)*s,13*s,p);p.setColor(Color.rgb(150,55,55));rect(c,x-25,y-95,50,5,s);}
    }

    private final class Bullet {
        float x,y,vx,life=1.3f; Bullet(float x,float y,float vx){this.x=x;this.y=y;this.vx=vx;}
        void draw(Canvas c,float s){ p.setColor(Color.rgb(242,208,122)); c.drawCircle(x*s,y*s,5*s,p); }
    }
    private final class Particle {
        float x,y,vx,vy,life=.45f; Particle(float x,float y,float vx,float vy){this.x=x;this.y=y;this.vx=vx;this.vy=vy;}
        void draw(Canvas c,float s){ x+=vx*(1f/60f); y+=vy*(1f/60f); life-=1f/60f; p.setColor(Color.argb((int)(180*Math.max(0,life/.45f)),220,170,110)); c.drawCircle(x*s,y*s,3*s,p);}
    }
    private void updateParticles(float dt){ for(int i=particles.size()-1;i>=0;i--){Particle q=particles.get(i);q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=260*dt;q.life-=dt;if(q.life<=0)particles.remove(i);} }
}
