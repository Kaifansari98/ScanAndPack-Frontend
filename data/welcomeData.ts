import { AnimationObject } from 'lottie-react-native';

export interface OnboardingData {
  id: number;
  animation: AnimationObject;
  text: string;
  textColor: string;
  backgroundColor: string;
}

const data: OnboardingData[] = [
  {
    id: 1,
    animation: require('../assets/animations/lottie1.json'),
    text: 'Manage your production line with ease',
    textColor: '#000000',
    backgroundColor: '#fff',
  },
  {
    id: 2,
    animation: require('../assets/animations/qr-scan-code.json'),
    text: 'Scan QR codes to track items instantly',
    textColor: '#5e3939',
    backgroundColor: '#fff',
  },
  {
    id: 3,
    animation: require('../assets/animations/scan-pack.json'),
    text: 'Pack boxes and generate labels fast',
    textColor: '#000000',
    backgroundColor: '#fff',
  },
];

export default data;