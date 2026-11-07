import React,{useEffect,useRef,useState} from 'react';
import {AppState,Platform,PermissionsAndroid,Text,View} from 'react-native';
import {Stack} from 'expo-router';
import {WebView} from 'react-native-webview';
import {useProfil} from '@/profil';
import {CHAT_TEXT} from '@/jeanne-textes';

const ORIGIN='https://affectionplus.com';
export default function Jeanne(){
 const {compte}=useProfil();
 return <JeanneScreen key={compte?.session||'anonymous'} />;
}
function JeanneScreen(){
 const {langue,compte}=useProfil(),text=CHAT_TEXT[langue]||CHAT_TEXT.fr;
 const ref=useRef<WebView>(null),epoch=useRef(0),ready=useRef(false),paused=useRef(false),busy=useRef(false);
 const [tenant,setTenant]=useState(''),[error,setError]=useState('');
 useEffect(()=>{let current=true;fetch(ORIGIN+'/chat-service/api/host-config').then(async r=>{if(!r.ok)throw Error('unavailable');const value=await r.json();if(current)setTenant(value.tenant);}).catch(()=>{if(current)setError(text.unavailable);});return()=>{current=false;};},[text.unavailable]);
 // A different host session mounts a new screen; old requests cannot reach its WebView.
 useEffect(()=>{const lifetime=epoch;return()=>{lifetime.current++;};},[]);
 const revalidate=async()=>{
  if(!ready.current||paused.current||busy.current||!compte?.session)return;
  busy.current=true;const current=epoch.current;
  try{
   const response=await fetch(ORIGIN+'/api/chat-bridge/plus',{method:'POST',headers:{Origin:ORIGIN,'Content-Type':'application/json',Authorization:'Bearer '+compte.session},body:'{}'});
   if(!response.ok)throw Error('session');const value=await response.json();
   if(current===epoch.current){setError('');ref.current?.injectJavaScript('window.JeanneNative?.grant('+JSON.stringify(value.grant)+');true;');}
  }catch{if(current===epoch.current){ref.current?.injectJavaScript('window.JeanneNative?.logout();true;');setError(text.login);}}
  finally{busy.current=false;}
 };
 useEffect(()=>{const timer=setInterval(()=>void revalidate(),60000);const subscription=AppState.addEventListener('change',state=>{if(state==='active')void revalidate();});return()=>{clearInterval(timer);subscription.remove();};});
 const url=ORIGIN+'/chat-service/?native=1&tenant='+encodeURIComponent(tenant)+'&lang='+langue;
 return <View style={{flex:1}}><Stack.Screen options={{title:'Chat · Jeanne'}} />
  {error?<Text accessibilityRole="alert">{error}</Text>:null}
  {!compte?<Text accessibilityRole="alert">{text.login}</Text>:!tenant?<Text>{text.loading}</Text>:
   <WebView key={compte.session} ref={ref} source={{uri:url}} originWhitelist={[ORIGIN]} javaScriptEnabled allowsInlineMediaPlayback
    mediaPlaybackRequiresUserAction mediaCapturePermissionGrantType="grantIfSameHostElsePrompt" setSupportMultipleWindows={false}
    onShouldStartLoadWithRequest={request=>{try{const u=new URL(request.url);return u.origin===ORIGIN&&u.pathname.startsWith('/chat-service/');}catch{return false;}}}
    onMessage={async event=>{
     if(!event.nativeEvent.url.startsWith(ORIGIN+'/chat-service/'))return;
     let data;try{data=JSON.parse(event.nativeEvent.data);}catch{return;}
     if(data.type==='jeanne:ready'){ready.current=true;paused.current=false;void revalidate();}
     if(data.type==='jeanne:paused')paused.current=true;
     if(data.type==='jeanne:microphone'){
      const allowed=Platform.OS!=='android'||await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO)===PermissionsAndroid.RESULTS.GRANTED;
      ref.current?.injectJavaScript('window.JeanneNative?.microphone('+JSON.stringify(allowed)+');true;');
     }
    }} onError={()=>setError(text.unavailable)} />}
 </View>;
}
