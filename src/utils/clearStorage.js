// Clear all localStorage data when migrating to Supabase
export const clearAllLocalStorage = () => {
  // Clear all existing localStorage data
  localStorage.clear();
  sessionStorage.clear();
  
  console.log('All localStorage and sessionStorage cleared - migrated to Supabase');
};

// Clear localStorage automatically on app start
if (typeof window !== 'undefined') {
  clearAllLocalStorage();
}