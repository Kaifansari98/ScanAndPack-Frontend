import { useDispatch } from 'react-redux';
import { setCredentials, logout as logoutAction } from '@/redux/slices/authSlice';
import { saveSession, clearSession } from '@/utils/authStorage';

export const useAuth = () => {
  const dispatch = useDispatch();

  const login = async (user: any, token: string) => {
    await saveSession(token, user);
    dispatch(setCredentials({ user, token }));
  };

  const logout = async () => {
    await clearSession();
    dispatch(logoutAction());
  };

  return { login, logout };
};