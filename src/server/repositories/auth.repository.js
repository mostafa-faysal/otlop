import { supabaseAuthAdapter } from "../adapters/supabase/auth.adapter.js";

export const authRepository = {
  signInWithPassword: (credentials) =>
    supabaseAuthAdapter.signInWithPassword(credentials),
  signUp: (payload) => supabaseAuthAdapter.signUp(payload),
  signOut: () => supabaseAuthAdapter.signOut(),
  getCurrentUserAndProfile: () =>
    supabaseAuthAdapter.getCurrentUserAndProfile(),
  updateProfile: (userId, updateColumns) =>
    supabaseAuthAdapter.updateProfile(userId, updateColumns),
  listAddresses: (userId) => supabaseAuthAdapter.listAddresses(userId),
  createAddress: (userId, addressRow) =>
    supabaseAuthAdapter.createAddress(userId, addressRow),
  updateAddress: (userId, addressId, updateColumns) =>
    supabaseAuthAdapter.updateAddress(userId, addressId, updateColumns),
  deleteAddress: (userId, addressId) =>
    supabaseAuthAdapter.deleteAddress(userId, addressId),
};

