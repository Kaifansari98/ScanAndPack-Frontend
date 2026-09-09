// hooks/useAuth.ts
import { useDispatch } from 'react-redux';
import { setCredentials, logout as logoutAction } from '@/redux/slices/authSlice';
import { saveSession, clearSession } from '@/utils/authStorage';
import axios from '@/lib/axios';

export const useAuth = () => {
  const dispatch = useDispatch();

  const login = async (user: any, token: string) => {
    let fullUser = { ...user };

    // Ensure vendor details are attached if available
    if (fullUser.vendor) {
      if (fullUser.vendor.vendor_name && !fullUser.vendor_name) {
        fullUser.vendor_name = fullUser.vendor.vendor_name;
      }
    } else if (fullUser.vendor_id) {
      try {
        const res = await axios.get(`/vendor/${fullUser.vendor_id}`);
        const vendorData = res.data?.data || res.data?.vendor || res.data;
        if (vendorData && typeof vendorData === 'object') {
          fullUser.vendor = vendorData;
          if (vendorData.vendor_name) {
            fullUser.vendor_name = vendorData.vendor_name;
          }
        }
      } catch (e) {
        // Fallback if vendor endpoint fetch fails
      }
    }

    await saveSession(token, fullUser);
    dispatch(setCredentials({ user: fullUser, token }));
  };

  const logout = async () => {
    await clearSession();
    dispatch(logoutAction());
  };

  return { login, logout };
};

