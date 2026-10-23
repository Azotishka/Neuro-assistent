(()=> {
  const root=document.documentElement, key='qwen:themeMode';
  const apply=mode=>{
    const dark=mode==='dark'||(mode==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches);
    root.dataset.theme=dark?'dark':'light';
    document.getElementById('themeColor')?.setAttribute('content',dark?'#0b0d12':'#f6f7fb');
  };
  try{apply(localStorage.getItem(key)||'system')}catch{apply('system')}
  document.addEventListener('DOMContentLoaded',()=>{
    const syncNavigation=()=>{
      const page=document.body.dataset.page||'home';
      document.querySelectorAll('#desktopNav [data-route],#mobileNav [data-route]').forEach(button=>{
        const active=button.dataset.route===page;
        button.classList.toggle('active',active);
        if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
      });
    };
    document.querySelectorAll('#desktopNav [data-route],#mobileNav [data-route]').forEach(button=>button.addEventListener('click',()=>requestAnimationFrame(syncNavigation)));
    document.getElementById('themeBtn')?.addEventListener('click',()=>{
      const next=root.dataset.theme==='dark'?'light':'dark';
      try{localStorage.setItem(key,next)}catch{}
      apply(next);
      document.getElementById('themeIcon')?.replaceChildren(document.createTextNode(next==='dark'?'☀':'◐'));
    });
    new MutationObserver(syncNavigation).observe(document.body,{attributes:true,attributeFilter:['data-page']});
    syncNavigation();
  });
})();