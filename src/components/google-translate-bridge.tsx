'use client';

import * as React from 'react';

declare global {
 interface Window {
  google?: { translate?: { TranslateElement?: { new(config:Record<string,unknown>,element:string):unknown } } };
  googleTranslateElementInit?:()=>void;
 }
}

const COOKIE='dr-hossam-site-language';
const GT_COOKIE='googtrans';

function getLanguage(){
 const value=document.cookie.match(new RegExp('(?:^|; )'+COOKIE+'=([^;]*)'))?.[1];
 return value==='en'||value==='fr'?value:'ar';
}

function protectNames(){
 const selectors=['a[href^="/lawyers/"]','a[href^="/cases/"]','a[href^="/clients/"]','[data-notranslate="name"]'];
 document.querySelectorAll<HTMLElement>(selectors.join(',')).forEach(el=>{
  el.classList.add('notranslate'); el.setAttribute('translate','no');
  el.querySelectorAll<HTMLElement>('*').forEach(child=>{child.classList.add('notranslate');child.setAttribute('translate','no');});
 });
}

function hideGoogleUi(){
 document.querySelectorAll('.goog-te-banner-frame,.goog-te-balloon-frame,.goog-tooltip').forEach((el:Element)=>{(el as HTMLElement).style.display='none';});
 document.body.style.top='0';
}

function applyGoogleLanguage(language:'en'|'fr'){
 const select=document.querySelector<HTMLSelectElement>('select.goog-te-combo');
 if(!select)return false;
 if(select.value!==language){select.value=language;select.dispatchEvent(new Event('change',{bubbles:true}));}
 return true;
}

export function GoogleTranslateBridge(){
 React.useEffect(()=>{
  const language=getLanguage(); document.documentElement.lang='ar'; protectNames();
  if(language==='ar'){hideGoogleUi();return;}
  document.cookie=GT_COOKIE+'=/ar/'+language+'; Path=/; Max-Age=31536000; SameSite=Lax';
  let stopped=false; let tries=0; let timer:number|undefined;
  const finish=()=>{
   if(stopped)return; protectNames(); hideGoogleUi();
   if(applyGoogleLanguage(language)){
    window.setTimeout(()=>{protectNames();hideGoogleUi();},300);
    window.setTimeout(()=>{protectNames();hideGoogleUi();},1000);
    window.setTimeout(()=>{protectNames();hideGoogleUi();},2500);
    if(timer)window.clearInterval(timer);
   } else if(++tries>80 && timer)window.clearInterval(timer);
  };
  window.googleTranslateElementInit=()=>{
   if(window.google?.translate?.TranslateElement){
    new window.google.translate.TranslateElement({pageLanguage:'ar',includedLanguages:'en,fr',autoDisplay:false,multilanguagePage:true,'google_translate_element');
   }
   finish();
  };
  const existing=document.getElementById('google-translate-script');
  if(!existing){const script=document.createElement('script');script.id='google-translate-script';script.src='https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';script.async=true;document.head.appendChild(script);}
  else if(window.google?.translate?.TranslateElement)window.googleTranslateElementInit();
  const observer=new MutationObserver(()=>{protectNames();hideGoogleUi();});
  observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  timer=window.setInterval(finish,250); finish();
  return()=>{stopped=true;if(timer)window.clearInterval(timer);observer.disconnect();};
 },[]);
 return <div id="google_translate_element" className="pointer-events-none fixed -left-[10000px] top-0 z-[-1] h-1 w-1 overflow-hidden opacity-0" aria-hidden="true"/>;
}
