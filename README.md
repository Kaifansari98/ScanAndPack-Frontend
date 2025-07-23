Use Auth Data Anywhere
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';

const user = useSelector((state: RootState) => state.auth.user);
const token = useSelector((state: RootState) => state.auth.token);
