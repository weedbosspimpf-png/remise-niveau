import sys,numpy as np,soundfile as sf,mido
from scipy.signal import butter,sosfilt,fftconvolve
D=sys.argv[1];BPM=147;SR=44100;TPB=480;beat=60/BPM;BARS=16;rng=np.random.default_rng(44)
R=[]  # (beat, vel, pitch factor)
# mesure 8 : roulement court sur les 2 derniers temps (doubles puis triples croches)
t0=7*4
for j in range(4): R.append((t0+2.0+j*0.25,60+8*j,1.0+0.02*j))
for j in range(8): R.append((t0+3.0+j*0.125,75+5*j,1.08+0.02*j))
# mesures 15-16 : montée classique avant la reprise de la boucle
t0=14*4
for j in range(8): R.append((t0+j*0.5,50+3*j,1.0))                              # croches
t0=15*4
for j in range(8): R.append((t0+j*0.25,72+3*j,1.05+0.015*j))                    # doubles croches (temps 1-2)
for j in range(16): R.append((t0+2+j*0.125,90+2*j,1.17+0.02*j))                  # triples croches (temps 3-4)
mf=mido.MidiFile(f'{D}/DRUMS_808_SNARE_147BPM_Bm.mid');tr=mido.MidiTrack();tr.append(mido.MetaMessage('track_name',name='roulements'));ms=[]
for t,v,p in R: ms+=[(int(t*TPB),1,mido.Message('note_on',note=40,velocity=min(127,v),channel=9)),(int((t+0.1)*TPB),0,mido.Message('note_off',note=40,velocity=0,channel=9))]
ms.sort(key=lambda m:(m[0],m[1]));last=0
for tk,_,m in ms: m.time=tk-last;last=tk;tr.append(m)
mf.tracks.append(tr);mf.save(f'{D}/DRUMS_808_ROULEMENTS_147BPM_Bm.mid')
N=int(BARS*4*beat*SR);X=np.zeros(N)
for t,v,p in R:
  L=int(0.22*SR);tt=np.arange(L)/SR
  body=np.sin(2*np.pi*np.cumsum((240+60*np.exp(-tt*60))*p)/SR)*np.exp(-tt*34)*0.5
  wires=sosfilt(butter(2,[2500*p,min(11000*p,20000)],'band',fs=SR,output='sos'),rng.standard_normal(L))*np.exp(-tt*22)*0.7
  s=np.tanh(1.5*(body+wires))*min(127,v)/127*0.5;a=int(t*beat*SR);X[a:a+L]+=s[:N-a]
ir=rng.standard_normal(int(0.8*SR))*np.exp(-np.arange(int(0.8*SR))/SR*7);ir=sosfilt(butter(2,[400,7000],'band',fs=SR,output='sos'),ir);ir/=np.sqrt((ir**2).sum())
RO=np.stack([X*0.9+fftconvolve(X,ir)[:N]*0.2,X+fftconvolve(X,np.roll(ir,131))[:N]*0.2],1)
SN,_=sf.read(f'{D}/snare_seule.wav');H,_=sf.read(f'{D}/hats_seuls.wav');C,_=sf.read(f'{D}/clap_seul.wav');b8,_=sf.read(f'{D}/808_seul.wav');kk,_=sf.read(f'{D}/kick_seul.wav')
SN=SN[:N]*(np.abs(C).max()*0.9/np.abs(SN).max());RO*=np.abs(SN).max()/np.abs(RO).max()*0.85
# remove the old 2-hit fills that overlap the rolls (bars 8 and 16, beat 3.5+)
for b in(7,15):
  a=int((b*4+3.4)*beat*SR);e=int((b+1)*4*beat*SR);SN[a:e]=0
snr=SN+RO;full=b8[:N]+kk[:N]+H[:N]+C[:N]*0.7+snr
for name,x in(('roulements_seuls',RO),('snare_roulements_hats',snr+H[:N]),('drums_808_roulements_complet',full)): sf.write(f'{D}/{name}.wav',(x*0.85/np.abs(x).max()).astype('float32'),SR,subtype='PCM_24')
print('coups de roulement',len(R))
