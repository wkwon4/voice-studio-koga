import {NextResponse} from 'next/server';
import {accessStatus} from './lib/auth.js';
export function proxy(request) {
 const status=accessStatus(request);
 if(status!==200) return new NextResponse(status===503?'Set STUDIO_PASSWORD before deploying.':'Private studio',{status,headers:{'WWW-Authenticate':'Basic realm="Koga Voice Studio", charset="UTF-8"','Cache-Control':'no-store'}});
 return NextResponse.next();
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico).*)']};
