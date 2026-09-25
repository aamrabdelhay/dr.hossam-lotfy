'use client';
import * as React from 'react';
type Ctx={language:'ar';setLanguage:(language:'ar')=>void};
const LanguageContext=React.createContext<Ctx>({language:'ar',setLanguage:()=>undefined});
export function SiteLanguageProvider({children}:{children:React.ReactNode}){const setLanguage=React.useCallback(()=>undefined,[]);return <LanguageContext.Provider value={{language:'ar',setLanguage}}>{children}</LanguageContext.Provider>;}
export function useSiteLanguage(){return React.useContext(LanguageContext);}
