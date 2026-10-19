/* Founder story popup: opens 3 seconds after the page loads.
   - Put your form service URL (e.g. a Formspree endpoint) in data-endpoint on the <form id="fp-form">.
   - DELAY: time before the popup appears (ms).
   - REMEMBER: "session" = once closed, stay hidden until the visitor closes the tab.
               "never"   = show on every page load.
   Visitors who submit the form are not shown the popup again on that browser. */
(function(){
  var DELAY=3000, REMEMBER="session";
  var KEY_CLOSED="rf_popup_closed", KEY_SENT="rf_popup_sent";
  function get(store,k){try{return window[store].getItem(k)}catch(e){return null}}
  function set(store,k){try{window[store].setItem(k,"1")}catch(e){}}
  if(get("localStorage",KEY_SENT)||(REMEMBER==="session"&&get("sessionStorage",KEY_CLOSED)))return;

  var html='<div class="fp-box" role="dialog" aria-modal="true" aria-labelledby="fp-title" aria-describedby="fp-desc">'
   +'<button type="button" class="fp-close" aria-label="Close">&times;</button>'
   +'<div class="fp-head"><span class="fp-brand">RAJAFOUNDER</span>'
   +'<h2 id="fp-title">Your Story Deserves the Spotlight! \uD83D\uDE80</h2>'
   +'<p id="fp-desc">Inspire the next generation of entrepreneurs by sharing your founder journey with us.</p></div>'
   +'<form class="fp-form" id="fp-form" data-endpoint="" novalidate>'
   +'<label>Founder Name<input name="name" type="text" autocomplete="name" placeholder="Founder Name" required></label>'
   +'<label>Email Address<input name="email" type="email" autocomplete="email" placeholder="Email Address" required></label>'
   +'<label>Your Success Story<textarea name="story" placeholder="Your Success Story" required></textarea></label>'
   +'<div class="fp-hp" aria-hidden="true"><label>Leave empty<input name="_gotcha" type="text" tabindex="-1" autocomplete="off"></label></div>'
   +'<button class="btn" type="submit">Share Your Story</button>'
   +'<p class="fp-msg" id="fp-msg" role="status" aria-live="polite"></p></form>'
   +'<p class="fp-foot">Your journey could inspire the next big dreamer.</p></div>';

  var ov=document.createElement("div");ov.className="fp-overlay";ov.innerHTML=html;
  var prevFocus=null;

  function focusables(){return ov.querySelectorAll('button:not([disabled]),input:not([tabindex="-1"]),textarea')}
  function close(){
    ov.classList.remove("open");document.removeEventListener("keydown",onKey);
    document.body.style.overflow=ov._bo||"";
    set("sessionStorage",KEY_CLOSED);
    setTimeout(function(){if(ov.parentNode)ov.parentNode.removeChild(ov)},350);
    if(prevFocus&&prevFocus.focus)try{prevFocus.focus()}catch(e){}
  }
  function onKey(e){
    if(e.key==="Escape"){e.preventDefault();close();return}
    if(e.key!=="Tab")return;
    var f=focusables();if(!f.length)return;
    var first=f[0],last=f[f.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
  }
  function open(){
    if(document.querySelector("dialog[open]"))return setTimeout(open,2000); /* don't cover an open founder profile */
    prevFocus=document.activeElement;
    document.body.appendChild(ov);
    ov._bo=document.body.style.overflow;document.body.style.overflow="hidden";
    void ov.offsetWidth;ov.classList.add("open");
    document.addEventListener("keydown",onKey);
    setTimeout(function(){var n=ov.querySelector('input[name="name"]');if(n)n.focus()},60);
  }

  ov.addEventListener("click",function(e){if(e.target===ov)close()});
  ov.querySelector(".fp-close").addEventListener("click",close);

  var f=ov.querySelector("#fp-form"),m=ov.querySelector("#fp-msg");
  f.addEventListener("submit",function(e){
    e.preventDefault();m.className="fp-msg";
    var name=f.name.value.trim(),email=f.email.value.trim(),story=f.story.value.trim();
    if(!name){m.textContent="Please enter your name.";m.className="fp-msg err";f.name.focus();return}
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){m.textContent="Please enter a valid email address.";m.className="fp-msg err";f.email.focus();return}
    if(!story){m.textContent="Please share a few lines of your story.";m.className="fp-msg err";f.story.focus();return}
    if(f._gotcha.value)return; /* bot */
    var url=f.getAttribute("data-endpoint");
    if(!url){m.textContent="Submissions are not connected yet. Please check back soon.";m.className="fp-msg err";return}
    var b=f.querySelector(".btn");b.disabled=true;
    fetch(url,{method:"POST",body:new FormData(f),headers:{Accept:"application/json"}})
      .then(function(r){if(!r.ok)throw 0;
        m.textContent="Thank you! We have received your story.";m.className="fp-msg ok";f.reset();
        set("localStorage",KEY_SENT);setTimeout(close,2200)})
      .catch(function(){m.textContent="Something went wrong. Please try again.";m.className="fp-msg err"})
      .then(function(){b.disabled=false});
  });

  setTimeout(open,DELAY);
})();
