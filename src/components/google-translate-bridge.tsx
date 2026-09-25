'use client';

import * as React from 'react';

declare global {
 interface Window {
  google?: {translate?: {TranslateElement?: {new(config:Record<string,unknown>,element:string):unknown}}};
  googleTranslateElementInit?:()=>void;
 }
}

const COOKIE='dr-hossam-site-language';
const GT_COOKIE='googtrans';

function protectNames(){
 const selectors=[
  'a[href^="/lawyers/"]','a[href^="/cases/"]','a[href^="/clients/"]',
  '[data-notranslate="name"]'
 ];
 document.querySelectorAll<HTMLElement>(selectors.join(',')).forEach(el=>{
  el.classList.add('notranslate');
  el.setAttribute('translate','no');
 });
}

export function GoogleTranslateBridge(){
 const[language,setLanguage]=React.useState('ar');
 React.useEffect(()=>{
  const read=()=>document.cookie.match(new RegExp('(?:^|; )'+COOKIE+'=([^;]*)'))?.[1]||'ar';
  setLanguage(read());
  protectNames();
  if(read()==='ar') return;
  const current=read();
  const existing=document.getElementById('google-translate-script');
  const init=()=>{
   window.googleTranslateElementInit=()=>{
    if(window.google?.translate?.TranslateElement){
     new window.google.translate.TranslateElement({pageLanguage:'ar',autoDisplay:false,multilanguagePage:true},'google_translate_element');
    }
   };
   window.googleTranslateElementInit();
  };
  if(!existing){
   const script=document.createElement('script');
   script.id='google-translate-script';
   script.src='https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
   script.async=true;
   document.head.appendChild(script);
  } else if(window.google?.translate?.TranslateElement) init();
  const timer=window.setInterval(protectNames,500);
  return()=>window.clearInterval(timer);
 },[]);
 return <div className="skiptranslate fixed -left-[9999px] -top-[9999px] h-px w-px overflow-hidden" aria-hidden="true"><div id="google_translate_element"/></div>;
}
