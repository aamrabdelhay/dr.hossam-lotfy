'use client';
import * as React from 'react';

type SiteLanguage='ar'|'en'|'fr';
const DEFAULT_SITE_LANGUAGE:SiteLanguage='ar';
const SITE_LANGUAGE_COOKIE='dr-hossam-site-language';
function isSiteLanguage(v:string|null|undefined):v is SiteLanguage{return v==='ar'||v==='en'||v==='fr';}

type Ctx={language:SiteLanguage;setLanguage:(language:SiteLanguage)=>void};
const LanguageContext=React.createContext<Ctx|null>(null);

export function SiteLanguageProvider({initialLanguage=DEFAULT_SITE_LANGUAGE,children}:{initialLanguage?:SiteLanguage;children:React.ReactNode}){
  const[language,setLanguageState]=React.useState<SiteLanguage>(initialLanguage);
  React.useEffect(()=>{
    const fromCookie=document.cookie.match(new RegExp('(?:^|; )'+SITE_LANGUAGE_COOKIE+'=([^;]*)'))?.[1];
    if(isSiteLanguage(fromCookie))setLanguageState(fromCookie);
    const onChange=(event:Event)=>{const next=(event as CustomEvent<string>).detail;if(isSiteLanguage(next))setLanguageState(next)};
    window.addEventListener('hl-language-change',onChange);
    return()=>window.removeEventListener('hl-language-change',onChange);
  },[]);
  const setLanguage=React.useCallback((next:SiteLanguage)=>{
    document.cookie=SITE_LANGUAGE_COOKIE+'='+next+'; Path=/; Max-Age=31536000; SameSite=Lax';
    setLanguageState(next);
    window.dispatchEvent(new CustomEvent('hl-language-change',{detail:next}));
  },[]);
  return <LanguageContext.Provider value={{language,setLanguage}}>{children}</LanguageContext.Provider>;
}
export function useSiteLanguage(){const value=React.useContext(LanguageContext);if(!value)throw new Error('useSiteLanguage must be used inside SiteLanguageProvider');return value;}
