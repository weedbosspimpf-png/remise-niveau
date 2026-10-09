import sys,numpy as np,soundfile as sf,mido
from scipy.signal import butter,sosfilt,fftconvolve
D=sys.argv[1];BPM=147;SR=44100;TPB=480;beat=60/BPM;BARS=16;rng=np.random.default_rng(55)
f=lambda n:440*2**((n-69)/12)
A=[(0,71,1),(1,72,.5),(1.5,71,.5),(2,66,2),(4,74,1),(5,73,1),(6,71,2),          # Bm (Do = 2nde mineure, couleur phrygienne)
   (8,74,1.5),(9.5,72,.5),(10,71,2),(12,67,1),(13,69,1),(14,71,2),              # G
   (16,76,1),(17,74,.5),(17.5,71,.5),(18,67,2),(20,64,1),(21,67,1),(22,71,2),   # Em
   (24,70,1.5),(25.5,73,.5),(26,78,2),(28,76,1),(29,73,1),(30,70,2)]            # F#
B=A[:-6]+[(24,73,1),(25,70,1),(26,66,2),(28,70,1),(29,73,.5),(29.5,74,.5),(30,71,2)]  # 2e moitié : résolution sur Si
mel=[(t,n,d,90) for t,n,d in A]+[(32+t,n,d,95) for t,n,d in B]
low=[(32+t,n-12,d,70) for t,n,d in B]          # doublure à l'octave basse sur la 2e moitié
pad=[];ch=[[47,50,54],[43,47,50],[40,43,47],[42,46,49]]
for g in range(8):
  for n in ch[g%4]: pad.append((g*8,n,8,65))
mf=mido.MidiFile(f'{D}/DRUMS_808_ROULEMENTS_147BPM_Bm.mid')
for name,lst,c,pg in(('melodie_sombre',mel,1,14),('melodie_octave_basse',low,2,0),('nappe_sombre',pad,3,89)):
  tr=mido.MidiTrack();tr.append(mido.MetaMessage('track_name',name=name));tr.append(mido.Message('program_change',program=pg,channel=c));ms=[]
  for t,n,d,v in lst: ms+=[(int(t*TPB),1,mido.Message('note_on',note=n,velocity=v,channel=c)),(int((t+d)*TPB),0,mido.Message('note_off',note=n,velocity=0,channel=c))]
  ms.sort(key=lambda m:(m[0],m[1]));last=0
  for tk,_,m in ms: m.time=tk-last;last=tk;tr.append(m)
  mf.tracks.append(tr)
mf.save(f'{D}/BEAT_COMPLET_147BPM_Bm.mid')
N=int(BARS*4*beat*SR)+int(3*SR);M=np.zeros(N);Lo=np.zeros(N);P=np.zeros(N)
lp=lambda x,fc:sosfilt(butter(2,fc,'low',fs=SR,output='sos'),x)
for t,n,d,v in mel:   # cloche sombre : FM + filtrage, déclin long
  L=int((d*beat+1.5)*SR);tt=np.arange(L)/SR
  s=np.sin(2*np.pi*f(n)*tt+1.4*np.exp(-tt*3)*np.sin(2*np.pi*f(n)*2.0*tt))*np.exp(-tt*1.3)
  s+=0.25*np.sin(2*np.pi*f(n)*0.5*tt)*np.exp(-tt*1.0)          # sous-octave pour l'épaisseur
  s=lp(s,3500)*v/127;s[:int(.004*SR)]*=np.linspace(0,1,int(.004*SR));a=int(t*beat*SR);M[a:a+L]+=s[:N-a]
for t,n,d,v in low:   # piano grave
  L=int((d*beat+1.2)*SR);tt=np.arange(L)/SR
  s=sum(np.sin(2*np.pi*f(n)*h*tt)*np.exp(-tt*(1.5+h))/h for h in range(1,6))*v/127;a=int(t*beat*SR);Lo[a:a+L]+=s[:N-a]
for t,n,d,v in pad:
  L=int((d*beat+2)*SR);tt=np.arange(L)/SR;s=sum(2*((tt*f(n+x))%1)-1 for x in(-.12,0,.12))
  e=np.minimum(1,tt/1.5)*np.minimum(1,(L/SR-tt)/2);s=lp(s,650)*e*v/127*(1+.2*np.sin(2*np.pi*.2*tt));a=int(t*beat*SR);P[a:a+L]+=s[:N-a]
M/=np.abs(M).max();Lo/=np.abs(Lo).max();P/=np.abs(P).max()
dry=np.stack([M*0.95+Lo*0.45+P*0.3*0.9,M*0.75+Lo*0.45+P*0.3],1)
# grande réverb sombre + delay pointé
t=np.arange(int(3*SR))/SR;ir=rng.standard_normal((len(t),2))*np.exp(-t*6.9/2.6)[:,None];ir=sosfilt(butter(2,[250,4500],'band',fs=SR,output='sos'),ir,axis=0);ir/=np.sqrt((ir**2).sum(0)).max()
send=M+P*0.5;wet=np.stack([fftconvolve(send,ir[:,c])[:N] for c in(0,1)],1)*0.55
dl=int(0.75*beat*SR);dly=np.zeros((N,2));dly[dl:,1]=M[:-dl]*0.3;dly[2*dl:,0]=M[:-2*dl]*0.18
MEL=(dry+wet+dly)[:int(BARS*4*beat*SR)]
fade=int(0.5*SR);MEL[-fade:]*=np.linspace(1,0.6,fade)[:,None]
drums,_=sf.read(f'{D}/drums_808_roulements_complet.wav');n=min(len(drums),len(MEL))
MEL=MEL[:n];MEL*=np.abs(drums).max()/np.abs(MEL).max()*0.55
full=drums[:n]+MEL
sf.write(f'{D}/melodie_sombre_seule.wav',(MEL*0.85/np.abs(MEL).max()).astype('float32'),SR,subtype='PCM_24')
sf.write(f'{D}/beat_complet_melodie.wav',(full*0.85/np.abs(full).max()).astype('float32'),SR,subtype='PCM_24')
print('notes mélodie',len(mel))
