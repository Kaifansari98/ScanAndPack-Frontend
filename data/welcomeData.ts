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
    text: 'Lets Get Started with Scan And Pack',
    textColor: '#000000',
    backgroundColor: '#F2F2F5',
  },
  {
    id: 2,
    animation: require('../assets/animations/lottie2.json'),
    text: 'With us Exprecience the Simplicity',
    textColor: '#000000',
    backgroundColor: '#D1D1D6',
  },
  {
    id: 3,
    animation: require('../assets/animations/lottie3.json'),
    text: 'Enroll with the Smartest way of Production',
    textColor: '#000000',
    backgroundColor: '#A3A3AE',
  },
];

export default data;