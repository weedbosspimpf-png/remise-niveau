import sys,os,numpy as np,soundfile as sf,mido
from scipy.signal import butter,sosfilt,fftconvolve
OUT=sys.argv[1];BPM=140;SR=44100;TPB=480;st=60/BPM/4;BARS=16;rng=np.random.default_rng(140)
f=lambda n:440*2**((n-69)/12)
hp=lambda x,fc,o=2:sosfilt(butter(o,fc,'high',fs=SR,output='sos'),x);lp=lambda x,fc,o=2:sosfilt(butter(o,fc,'low',fs=SR,output='sos'),x)
bp=lambda x,a,b:sosfilt(butter(2,[a,b],'band',fs=SR,output='sos'),x)
def fade(x,ms=3):
  n=int(ms/1000*SR);x[-n:]*=np.linspace(1,0,n);return x
# ---------- ONE-SHOTS ----------
A1=f(33)   # La1 = 55 Hz
def kick(v=1):
  L=int(0.35*SR);tt=np.arange(L)/SR
  x=np.sin(2*np.pi*np.cumsum(A1+230*np.exp(-tt*45))/SR)*np.exp(-tt*11)+hp(rng.standard_normal(L),3500)*np.exp(-tt*600)*0.6
  return fade(np.tanh(1.4*x)*v)
def snare(v=1):
  L=int(0.32*SR);tt=np.arange(L)/SR;b=np.sin(2*np.pi*np.cumsum(220*1.0+90*np.exp(-tt*70))/SR)*np.exp(-tt*30)*0.5   # corps ~La3
  w=bp(rng.standard_normal(L),3000,12500)*np.exp(-tt*18)*0.85;return fade(np.tanh(1.9*(b+w))*v)
def clap(v=1):
  L=int(0.4*SR);tt=np.arange(L)/SR;n=bp(rng.standard_normal(L),900,8500);x=np.zeros(L)
  for d,a in((0,1),(0.009,.8),(0.019,.9),(0.03,.6)):
    i=int(d*SR);x[i:]+=n[:L-i]*np.exp(-np.arange(L-i)/SR*(60 if d<.03 else 13))*a
  return fade(x*v*0.8)
def rim(v=1):
  L=int(0.12*SR);tt=np.arange(L)/SR;return fade((np.sin(2*np.pi*880*tt)*0.6+np.sin(2*np.pi*1650*tt)*0.3+hp(rng.standard_normal(L),2500)*0.4)*np.exp(-tt*55)*v)
def hat(v=1,dec=95):
  L=int(0.09*SR);tt=np.arange(L)/SR
  m=sum(np.sign(np.sin(2*np.pi*fr*tt)) for fr in(317,421,559,743,893,1103))/6      # métal (style 808)
  return fade(hp(m*0.6+rng.standard_normal(L)*0.5,8000,4)*np.exp(-tt*dec)*v)
def openhat(v=1):
  L=int(0.6*SR);tt=np.arange(L)/SR;m=sum(np.sign(np.sin(2*np.pi*fr*tt)) for fr in(317,421,559,743,893,1103))/6
  return fade(hp(m*0.6+rng.standard_normal(L)*0.5,7000,4)*np.exp(-tt*7)*v)
def crash(v=1):
  L=int(2.5*SR);tt=np.arange(L)/SR;return fade(hp(rng.standard_normal(L),4500)*np.exp(-tt*1.6)*v*0.7)
def perc(v=1):
  L=int(0.2*SR);tt=np.arange(L)/SR;return fade(np.sin(2*np.pi*np.cumsum(f(69)*(1+0.5*np.exp(-tt*60)))/SR)*np.exp(-tt*22)*v)   # perc accordée en La
def b808(n=33,dur=1.5):
  L=int(dur*SR);tt=np.arange(L)/SR;x=np.sin(2*np.pi*np.cumsum(f(n)*(1+0.6*np.exp(-tt*40)))/SR)
  return fade(np.tanh(2.8*x)*0.75*np.exp(-tt*0.6)+0.25*np.sin(2*np.pi*f(n)*tt)*np.exp(-tt*0.6),20)
os.makedirs(f'{OUT}/one_shots',exist_ok=True)
shots={'Kick_La':kick(),'Snare':snare(),'Clap':clap(),'Rim':rim(),'Hat':hat(),'OpenHat':openhat(),'Crash':crash(),'Perc_La':perc(),'808_La1':b808()}
for k,x in shots.items():
  x=x/np.abs(x).max()*0.89;sf.write(f'{OUT}/one_shots/{k}.wav',np.stack([x,x],1).astype('float32'),SR,subtype='PCM_24')
# ---------- BOUCLE DRILL 16 mesures ----------
ROOT=[33,33,29,28]     # Am | Am | F | E
P1=[(0,7,0),(7,3,12),(10,6,0)];P2=[(0,6,0),(6,2,7),(8,4,0),(12,4,12)];P3=[(0,5,0),(5,2,1),(7,3,0),(10,3,-2),(13,3,0)]
B8=[];K=[];SN=[];CL=[];H=[];OH=[];RM=[];CR=[]
for b in range(BARS):
  t0=b*16;r=ROOT[b%4];pat=P3 if b in(4,12) else (P1 if b%2==0 else P2)
  if b==BARS-1: pat=[(0,8,0),(8,8,0)]
  for s,d,o in pat: B8.append((t0+s,r+o,d))
  for s,d,o in pat:
    if s in(0,7,10,13) or (s==8 and b%2==1): K.append((t0+s,1.0 if s==0 else .85))
  SN.append((t0+8,1.0));CL.append((t0+8,.7))
  if b%2==1: SN.append((t0+14,.8))
  if b%4==2: SN.append((t0+11,.45))
  if b%8==7: SN+=[(t0+13,.65),(t0+15,.8)]
  base=[0,3,6,8,11,14] if b%2==0 else [0,2,3,6,8,11,12,14]
  for s in base:
    if b%4==3 and s>=12: continue
    H.append((t0+s,1.0 if s in(0,8) else .72))
  if b%4==3:
    for j in range(6): H.append((t0+12+j*4/6,.6+.07*j))
  if b%8==5:
    for j in range(4): H.append((t0+4+j*.5,.55+.1*j))
  if b%4==1: OH.append((t0+14,.8))
  if b%2==0: RM.append((t0+5,.6))
  if b%8==0: CR.append((t0,.6))
N=int(BARS*16*st*SR)+int(2.5*SR)
def lay(ev,fn):
  out=np.zeros(N)
  for s,v in ev:
    x=fn(v);a=int(s*st*SR);e=min(N,a+len(x));out[a:e]+=x[:e-a]
  return out
Kx=lay(K,kick);Sx=lay(SN,snare)+lay(CL,clap)*0.6;Hx=lay(H,hat);Ox=lay(OH,openhat);Rx=lay(RM,rim);Cx=lay(CR,crash)
fr=np.full(N,f(33));amp=np.zeros(N)
for j,(s,n,d) in enumerate(B8):
  a=int(s*st*SR);bb=min(N,a+int(d*st*SR));tt=np.arange(bb-a)/SR;fc=np.full(bb-a,f(n))
  if j+1<len(B8) and B8[j+1][0]==s+d and B8[j+1][1]!=n:
    g=min(int(0.11*SR),bb-a);fc[-g:]=np.geomspace(f(n),f(B8[j+1][1]),g)
  fr[a:bb]=fc;e=np.exp(-tt*0.45);e[:90]*=np.linspace(0,1,90);e[-700:]*=np.linspace(1,0,700);amp[a:bb]=e
ph=2*np.pi*np.cumsum(fr)/SR;B=hp((np.tanh(3*np.sin(ph))*0.7+0.3*np.sin(ph))*amp,28)
du=np.ones(N)
for s,v in K:
  a=int(s*st*SR);L=int(0.08*SR);du[a:a+L]=np.minimum(du[a:a+L],(1-0.55*np.exp(-np.arange(L)/SR*40))[:N-a])
B*=du
ir=rng.standard_normal(int(0.7*SR))*np.exp(-np.arange(int(0.7*SR))/SR*8);ir=bp(ir,400,7000);ir/=np.sqrt((ir**2).sum())
st2=lambda x,l=1,r=1:np.stack([x*l,x*r],1)
parts={'kick':st2(Kx)*0.55/np.abs(Kx).max(),'snare_clap':np.stack([Sx+fftconvolve(Sx,ir)[:N]*.18,Sx+fftconvolve(Sx,np.roll(ir,111))[:N]*.18],1)*0.42/np.abs(Sx).max(),
       'hats':st2(Hx,.85,1)*0.16/np.abs(Hx).max()+st2(Ox,1,.8)*0.11/max(np.abs(Ox).max(),1e-9),'perc_rim_crash':st2(Rx,1,.6)*0.12/np.abs(Rx).max()+st2(Cx)*0.1/np.abs(Cx).max(),'808':st2(B)*0.55/np.abs(B).max()}
drums=parts['kick']+parts['snare_clap']+parts['hats']+parts['perc_rim_crash'];full=drums+parts['808']
os.makedirs(f'{OUT}/boucle',exist_ok=True)
for k,x in list(parts.items())+[('drums_complet',drums),('drums_808_complet',full)]:
  sf.write(f'{OUT}/boucle/{k}.wav',(x*0.85/np.abs(x).max()).astype('float32'),SR,subtype='PCM_24')
mf=mido.MidiFile(ticks_per_beat=TPB);meta=mido.MidiTrack();mf.tracks.append(meta)
meta+=[mido.MetaMessage('set_tempo',tempo=mido.bpm2tempo(BPM)),mido.MetaMessage('key_signature',key='Am'),mido.MetaMessage('track_name',name='DRILL KIT 140 Am')]
tracks=[('808',[(s,n,d,110) for s,n,d in B8],0)]+[(nm,[(s,nt,0.5,int(v*120)) for s,v in ev],9) for nm,ev,nt in(('kick',K,36),('snare',SN,38),('clap',CL,39),('hats',H,42),('openhat',OH,46),('rim',RM,37),('crash',CR,49)) for _ in[0]]
for nm,ev,ch in tracks:
  tr=mido.MidiTrack();tr.append(mido.MetaMessage('track_name',name=nm))
  if ch==0: tr.append(mido.Message('program_change',program=38,channel=0))
  ms=[]
  for s,n,d,v in ev: ms+=[(int(s*TPB/4),1,mido.Message('note_on',note=n,velocity=min(127,v),channel=ch)),(int((s+d)*TPB/4),0,mido.Message('note_off',note=n,velocity=0,channel=ch))]
  ms.sort(key=lambda m:(m[0],m[1]));lt=0
  for tk,_,m in ms: m.time=tk-lt;lt=tk;tr.append(m)
  mf.tracks.append(tr)
mf.save(f'{OUT}/DRILL_KIT_140BPM_Am.mid')
print('one-shots',len(shots),'| boucle',BARS,'mesures',round(N/SR,1),'s')
