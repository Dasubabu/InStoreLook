const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add imports
const imports = `import SellerLayout from "./components/layout/SellerLayout";
import DashboardScreen from "./components/screens/DashboardScreen";
import InventoryScreen from "./components/screens/InventoryScreen";
import StoreProfileScreen from "./components/screens/StoreProfileScreen";
import SettingsScreen from "./components/screens/SettingsScreen";
import NotificationsScreen from "./components/screens/NotificationsScreen";
import AddEditProductScreen from "./components/screens/AddEditProductScreen";
`;
content = content.replace(/import SellerUploadModal from ".\/components\/SellerUploadModal";/, imports);

// 2. Remove SellerUploadModal rendering since we have AddEditProductScreen
content = content.replace(/\{\/\* 10-Angle Seller Upload Modal \*\/\}[\s\S]*?\/>/, '');

// 3. Replace seller_home with the new SellerLayout and screens
const sellerScreens = `
          {['seller_home', 'inventory', 'store_profile', 'settings'].includes(state.screen) && (
            <SellerLayout currentScreen={state.screen} setScreen={setScreen}>
              {state.screen === 'seller_home' && <DashboardScreen setScreen={setScreen} />}
              {state.screen === 'inventory' && <InventoryScreen setScreen={setScreen} />}
              {state.screen === 'store_profile' && <StoreProfileScreen setScreen={setScreen} />}
              {state.screen === 'settings' && <SettingsScreen setScreen={setScreen} />}
            </SellerLayout>
          )}

          <AnimatePresence>
            {state.screen === 'add_product' && <AddEditProductScreen setScreen={setScreen} />}
            {state.screen === 'notifications' && <NotificationsScreen setScreen={setScreen} />}
          </AnimatePresence>
`;

content = content.replace(/\{\/\* SELLER DASHBOARD \*\/\}[\s\S]*?<\/motion\.div>/, sellerScreens);

fs.writeFileSync('src/App.tsx', content);
console.log('App.tsx updated');
