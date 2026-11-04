export function accessStatus(request) {
 const password=process.env.STUDIO_PASSWORD;
 if(!password)return process.env.NODE_ENV==='production'?503:200;
 let decoded='';try{decoded=atob((request.headers.get('authorization')||'').replace(/^Basic /,''));}catch{}
 return decoded===`koga:${password}`?200:401;
}
