import sys,numpy as np,soundfile as sf,mido
from scipy.signal import butter,sosfilt,fftconvolve
OUT=sys.argv[1];BPM=147;SR=44100;TPB=480;beat=60/BPM;rng=np.random.default_rng(7)
# ---------------- structure ----------------
SECT=[('intro',8),('couplet',16),('refrain',16),('couplet',16),('refrain',16),('pont',8),('refrain',16),('outro',8)]
bars=[];start={}
for name,n in SECT:
  for i in range(n): bars.append((name,i,n))
NB=len(bars);N=int((NB*4*beat+4)*SR)
prog=[('Bm',[59,62,66],47),('G',[59,62,67],43),('Em',[59,64,67],40),('F#',[58,61,66],42)]
f=lambda n:440*2**((n-69)/12)
EV={k:[] for k in['pad','piano','cloches','contre','808','kick','clap','hats','openhat','perc']}
FX=[]  # (type,time_beats)
mel=[(0,71,1.5),(1.5,74,0.5),(2,73,1),(3,71,1),(4,69,1.5),(5.5,71,0.5),(6,66,2)]
contre={'Bm':[78,74,71,74],'G':[79,74,71,74],'Em':[79,76,71,76],'F#':[78,73,70,73]}
for b,(sec,i,n) in enumerate(bars):
  name,notes,root=prog[(b//2)%4];t0=b*4;last=(i==n-1);first=(i==0);even=(i%2==0)
  drums = sec in('couplet','refrain') or (sec=='pont' and i>=4)
  if last and sec in('couplet','pont','intro'): drums_cut=True
  else: drums_cut=False
  # pad everywhere except couplet low-energy keeps pad
  if even: 
    for nn in notes: EV['pad'].append((t0,nn-12,8,60 if sec=='couplet' else 75))
  # dark low piano: root+fifth octave, whole bars
  if sec!='intro' and even:
    for nn in(root,root+7,root+12): EV['piano'].append((t0,nn,7.5,70))
  # bells
  if even and sec in('intro','refrain','pont','outro'):
    for t,nn,d in mel:
      nn=nn+1 if (name=='F#' and nn==69) else nn;EV['cloches'].append((t0+t,nn,d,80 if sec=='refrain' else 65))
  if even and sec=='couplet':
    for t,nn,d in mel[:3]: EV['cloches'].append((t0+t,nn,d,55))
  # counter melody in refrains (second bar of pair)
  if sec=='refrain' and not even:
    for t,nn in zip([0,0.75,1.5,2.5],contre[name]): EV['contre'].append((t0+t,nn,0.7,78))
  # 808 with slides
  if drums and not drums_cut:
    pat=[(0,1.5),(1.75,0.75),(2.5,0.5),(3,1)] if even else [(0,2),(2.75,0.5),(3.5,0.5)]
    for t,d in pat: EV['808'].append((t0+t,root-12,d,110))
    if not even:  # slide up an octave / to next root at end of 2-bar group
      EV['808'][-1]=(t0+3.5,root,0.5,105)
    if sec=='pont': EV['808'][-len(pat):]=[(t0,root-12,4,105)]
  if sec=='pont' and i<4 and even: EV['808'].append((t0,root-12,8,90))
  if drums and not drums_cut:
    for t in([0,1.75,2.5] if even else [0,0.75,3.25]): EV['kick'].append((t0+t,36,0.25,120))
    EV['clap'].append((t0+2,39,0.25,115))
    dense = sec=='refrain'
    for k in range(8):
      t=t0+k*0.5
      if dense and i%4==3 and k==6:
        for j in range(6): EV['hats'].append((t+j/12,42,0.05,65+6*j))
      elif dense and not even and k==7:
        for j in range(4): EV['hats'].append((t+j*0.125,42,0.05,80))
      elif dense and i%8==5 and k in(2,3):
        for j in range(3): EV['hats'].append((t+j/6,42,0.05,75))
      else: EV['hats'].append((t,42,0.1,95 if k%2==0 else 68))
      if sec=='couplet' and k%2==1: EV['hats'].pop()  # couplets: quarter hats, more space
    if dense and i%4==1: EV['openhat'].append((t0+3.5,46,0.5,80))
    if sec=='refrain': EV['perc'].append((t0+1.5,37,0.2,70)); EV['perc'].append((t0+3.75,37,0.2,55))
  if drums_cut and sec in('couplet','pont'): EV['kick'].append((t0,36,0.25,120))
  if last and sec in('intro','couplet','pont'): FX.append(('riser',t0))
  if first and sec=='refrain': FX.append(('impact',t0))
  if first and sec in('couplet','outro') and b>0: FX.append(('impact',t0))
# ---------------- MIDI ----------------
mf=mido.MidiFile(ticks_per_beat=TPB);meta=mido.MidiTrack();mf.tracks.append(meta)
meta+= [mido.MetaMessage('set_tempo',tempo=mido.bpm2tempo(BPM)),mido.MetaMessage('key_signature',key='Bm'),mido.MetaMessage('track_name',name='SOMBRE_147_Bm')]
acc=0
for name,n in SECT: meta.append(mido.MetaMessage('marker',text=name,time=int(acc*4*TPB)) if False else mido.MetaMessage('marker',text=name,time=0 if acc==0 else n_prev*4*TPB)); n_prev=n; acc+=n
chs={'pad':(0,89),'piano':(1,0),'cloches':(2,14),'contre':(3,0),'808':(4,38),'kick':(9,0),'clap':(9,0),'hats':(9,0),'openhat':(9,0),'perc':(9,0)}
for k,lst in EV.items():
  ch,pg=chs[k];tr=mido.MidiTrack();tr.append(mido.MetaMessage('track_name',name=k))
  if ch!=9: tr.append(mido.Message('program_change',program=pg,channel=ch))
  ms=[]
  for t,nn,d,v in lst: ms+=[(int(t*TPB),1,mido.Message('note_on',note=nn,velocity=v,channel=ch)),(int((t+d)*TPB),0,mido.Message('note_off',note=nn,velocity=0,channel=ch))]
  ms.sort(key=lambda m:(m[0],m[1]));last=0
  for tk,_,m in ms: m.time=tk-last;last=tk;tr.append(m)
  mf.tracks.append(tr)
mf.save(f'{OUT}/INSTRU_SOMBRE_147BPM_Bm.mid')
# ---------------- synthesis ----------------
S={k:np.zeros(N) for k in list(EV)+['fx','vinyle']}
def put(k,t,s):
  i=int(t*beat*SR);j=min(N,i+len(s));S[k][i:j]+=s[:j-i]
def env(L,a,r):
  e=np.ones(L);ai=max(1,int(a*SR));e[:ai]=np.linspace(0,1,ai);ri=min(L,int(r*SR));e[-ri:]*=np.linspace(1,0,ri);return e
lp=lambda x,fc,o=2:sosfilt(butter(o,fc,'low',fs=SR,output='sos'),x)
hp=lambda x,fc,o=2:sosfilt(butter(o,fc,'high',fs=SR,output='sos'),x)
for t,n,d,v in EV['pad']:
  L=int((d*beat+1.5)*SR);tt=np.arange(L)/SR;s=sum(2*((tt*f(n+dt))%1)-1 for dt in(-0.1,0,0.1))
  s=lp(s,900)*env(L,1.2,1.5)*v/127*0.05*(1+0.15*np.sin(2*np.pi*0.25*tt));put('pad',t,s)
for t,n,d,v in EV['piano']+EV['contre']:
  k='contre' if (t,n,d,v) in EV['contre'] else 'piano'
  L=int((d*beat+1.0)*SR);tt=np.arange(L)/SR;fr=f(n)
  s=sum(np.sin(2*np.pi*fr*h*tt*(1+0.0004*h*h))*np.exp(-tt*(1.2+h*0.9))/h**1.1 for h in range(1,8))
  s=s*env(L,0.004,0.4)*v/127*(0.16 if k=='piano' else 0.13);put(k,t,s)
for t,n,d,v in EV['cloches']:
  L=int((d*beat+1.2)*SR);tt=np.arange(L)/SR
  s=np.sin(2*np.pi*f(n)*tt+1.8*np.exp(-tt*5)*np.sin(2*np.pi*f(n)*3.5*tt))*np.exp(-tt*1.8)*env(L,0.003,0.4)*v/127*0.13;put('cloches',t,s)
# 808: one continuous oscillator with glides
fr=np.zeros(N)+30.;amp=np.zeros(N);ev=sorted(EV['808'])
for idx,(t,n,d,v) in enumerate(ev):
  i=int(t*beat*SR);L=int(d*beat*SR);j=min(N,i+L+int(0.06*SR));tt=np.arange(j-i)/SR
  fcur=np.full(j-i,f(n))
  if idx+1<len(ev) and abs(ev[idx+1][0]-(t+d))<0.01 and ev[idx+1][1]!=n:   # slide into next note
    g=int(0.09*SR);fcur[-g:]=np.geomspace(f(n),f(ev[idx+1][1]),g) if g<len(fcur) else fcur[-g:]
  fr[i:j]=fcur;e=np.exp(-tt*0.7)*v/127;e[:int(0.003*SR)]*=np.linspace(0,1,int(0.003*SR));e[-int(0.05*SR):]*=np.linspace(1,0,int(0.05*SR))
  amp[i:j]=np.maximum(amp[i:j],e)
ph=2*np.pi*np.cumsum(fr)/SR;S['808']=np.tanh(2.5*np.sin(ph))*amp*0.45
for t,n,d,v in EV['kick']:
  L=int(0.3*SR);tt=np.arange(L)/SR;s=np.sin(2*np.pi*np.cumsum(50+170*np.exp(-tt*38))/SR)*np.exp(-tt*13)+0.25*rng.standard_normal(L)*np.exp(-tt*350);put('kick',t,s*v/127*0.55)
for t,n,d,v in EV['clap']:
  L=int(0.4*SR);tt=np.arange(L)/SR;nz=sosfilt(butter(2,[900,8000],'band',fs=SR,output='sos'),rng.standard_normal(L))
  s=nz*np.exp(-tt*12)+np.sin(2*np.pi*185*tt)*np.exp(-tt*30)*0.35
  for dl in(0,0.012,0.024): put('clap',t+dl/beat,s*v/127*0.28)
for k,dec,amt in(('hats',75,0.11),('openhat',8,0.1)):
  for t,n,d,v in EV[k]:
    L=int(0.4*SR);tt=np.arange(L)/SR;put(k,t,hp(rng.standard_normal(L),7500,4)*np.exp(-tt*dec)*v/127*amt)
for t,n,d,v in EV['perc']:
  L=int(0.15*SR);tt=np.arange(L)/SR;put('perc',t,(np.sin(2*np.pi*820*tt)*0.6+hp(rng.standard_normal(L),2000)*0.4)*np.exp(-tt*45)*v/127*0.18)
for typ,t in FX:
  if typ=='riser':
    L=int(4*beat*SR);tt=np.arange(L)/SR;x=rng.standard_normal(L);out=np.zeros(L);seg=2048
    for a in range(0,L,seg):
      fc=300+9000*(a/L)**2;out[a:a+seg]=sosfilt(butter(2,[fc,min(fc*1.6,20000)],'band',fs=SR,output='sos'),x[a:a+seg])
    put('fx',t,out*np.linspace(0,1,L)**2*0.35)
  else:
    L=int(2.5*SR);tt=np.arange(L)/SR;s=np.sin(2*np.pi*np.cumsum(35+60*np.exp(-tt*8))/SR)*np.exp(-tt*2)*0.5+lp(rng.standard_normal(L),3000)*np.exp(-tt*4)*0.25;put('fx',t,s)
cr=np.zeros(N);idx=rng.integers(0,N,int(N/SR*12));cr[idx]=rng.uniform(-1,1,len(idx));S['vinyle']=hp(cr,1500)*0.08+lp(rng.standard_normal(N),5000)*0.004
# reverb send (bells, contre, piano, pad, clap)
L=int(2.2*SR);tt=np.arange(L)/SR;ir=rng.standard_normal((L,2))*np.exp(-tt*6.9/1.9)[:,None];ir=sosfilt(butter(2,[300,6000],'band',fs=SR,output='sos'),ir,axis=0);ir/=np.sqrt((ir**2).sum(0)).max()
send=S['cloches']*0.5+S['contre']*0.4+S['piano']*0.25+S['pad']*0.3+S['clap']*0.15
rv=np.stack([fftconvolve(send,ir[:,c])[:N] for c in(0,1)],1)*0.9
# sidechain pump on pad/piano from kick
ke=np.zeros(N)
for t,*_ in EV['kick']:
  i=int(t*beat*SR);g=np.exp(-np.arange(int(0.25*SR))/SR*14);ke[i:i+len(g)]=np.maximum(ke[i:i+len(g)],g[:N-i])
duck=1-0.45*ke
pan={'pad':(0.9,1.0),'piano':(1.0,0.9),'cloches':(1.0,0.7),'contre':(0.7,1.0),'808':(1,1),'kick':(1,1),'clap':(1,1),'hats':(0.8,1.0),'openhat':(1.0,0.8),'perc':(0.6,1.0),'fx':(1,1),'vinyle':(0.9,1.0)}
gain={'pad':1.0,'piano':1.0,'cloches':1.0,'contre':1.0,'808':1.0,'kick':1.0,'clap':1.0,'hats':1.0,'openhat':1.0,'perc':1.0,'fx':0.8,'vinyle':1.0}
st={}
for k,s in S.items():
  s=s*(duck if k in('pad','piano') else 1)*gain[k];st[k]=np.stack([s*pan[k][0],s*pan[k][1]],1)
st['reverb']=rv
mix=sum(st.values())
# fades
fi=int(4*beat*SR);mix[:fi]*=np.linspace(0,1,fi)[:,None]**0.5
outro0=int(sum(n for _,n in SECT[:-1])*4*beat*SR);fo=N-outro0;mix[outro0:]*=np.linspace(1,0,fo)[:,None]**1.5
pk=np.abs(mix).max();sc=0.7/pk
import os;os.makedirs(f'{OUT}/stems',exist_ok=True)
groups={'kick':['kick'],'808':['808'],'clap_perc':['clap','perc'],'hats':['hats','openhat'],'piano':['piano'],'contre_melodie':['contre'],'cloches':['cloches'],'pad':['pad'],'fx_transitions':['fx'],'vinyle':['vinyle'],'reverb':['reverb']}
for g,ks in groups.items():
  sf.write(f'{OUT}/stems/{g}.flac',(sum(st[k] for k in ks)*sc).astype('float32'),SR,subtype='PCM_24')
sf.write(f'{OUT}/mix_raw.wav',(mix*sc).astype('float32'),SR)
print('bars',NB,'durée',round(N/SR,1),'s')
