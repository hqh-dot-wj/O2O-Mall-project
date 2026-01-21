
// @ts-nocheck
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('开始同步新增菜单...');

    // Base IDs start from 2000 to avoid conflict with existing system menus
    const BASE_ID = 2000;

    // Define the new menus structure
    const menus = [
        {
            menuId: 2000,
            menuName: '会员管理', // member
            path: '/member',
            component: 'layout.base$view.member',
            icon: 'mdi:account-group',
            orderNum: 10,
            menuType: 'M', // Menu
            perms: 'member:list',
            children: []
        },
        {
            menuId: 2100,
            menuName: '商品管理', // pms
            path: '/pms',
            component: 'layout.base',
            icon: 'icon-park-outline:commodity',
            orderNum: 11,
            menuType: 'M', // Directory
            children: [
                {
                    menuId: 2101,
                    menuName: '属性管理', // pms_attribute
                    path: '/pms/attribute',
                    component: 'view.pms_attribute',
                    menuType: 'C', // Menu
                    perms: 'pms:attribute:list',
                    icon: 'material-symbols:attribute-segment-outline'
                },
                {
                    menuId: 2102,
                    menuName: '品牌管理', // pms_brand
                    path: '/pms/brand',
                    component: 'view.pms_brand',
                    menuType: 'C',
                    perms: 'pms:brand:list',
                    icon: 'tabler:brand-shopee'
                },
                {
                    menuId: 2103,
                    menuName: '分类管理', // pms_category
                    path: '/pms/category',
                    component: 'view.pms_category',
                    menuType: 'C',
                    perms: 'pms:category:list',
                    icon: 'tabler:category'
                },
                {
                    menuId: 2104,
                    menuName: '标准商品', // pms_global-product
                    path: '/pms/global-product',
                    component: 'view.pms_global-product',
                    menuType: 'C',
                    perms: 'pms:global-product:list',
                    icon: 'icon-park-outline:ad-product',
                    children: [ // Although it has children in route, it might be a view with nested routes, but likely in menu it's a leaf or directory. 
                        // In routes.ts it has children. Let's make it a menu that can show list, and children are hidden or separate?
                        // The route 'pms_global-product' has component 'view.pms_global-product'.
                        // Its child is 'pms_global-product_create'. Usually create pages are hidden in menu.
                    ]
                }
            ]
        },
        {
            menuId: 2200,
            menuName: '门店管理', // store
            path: '/store',
            component: 'layout.base',
            icon: 'mdi:store',
            orderNum: 12,
            menuType: 'M',
            children: [
                {
                    menuId: 2201,
                    menuName: '门店营销', // store_marketing
                    path: '/store/marketing',
                    component: 'view.store_marketing',
                    menuType: 'C', // Or M if it has visible children as menu items? 
                    // In routes.ts it has children 'store_marketing_distribution'.
                    // Let's assume it's a sub-menu directory-like if it has children shown in menu.
                    // But component is 'view.store_marketing', suggesting it's a page.
                    // Only layout (M) or menu (C) logic. 
                    // If component is view.*, it's usually C.
                    perms: 'store:marketing:list',
                    icon: 'icon-park-outline:market',
                    children: [
                        {
                            menuId: 2202,
                            menuName: '分销管理', // store_marketing_distribution
                            path: '/store/marketing/distribution',
                            component: 'view.store_marketing_distribution',
                            menuType: 'C',
                            perms: 'store:marketing:distribution:list',
                        }
                    ]
                },
                {
                    menuId: 2210,
                    menuName: '门店商品', // store_product
                    path: '/store/product',
                    // meta had no component in routes.ts at parent level? 
                    // routes.ts line 273: path: '/store/product', meta: {...}, children: [...]
                    // No component specified for 'store_product'. It implies it's a directory (M).
                    // But it is not layout.base... wait.
                    // If no component, transformed usually to Layout or ParentView.
                    // Let's set it as Directory (M) logic or Component "ParentView".
                    // In seed.ts, parent directories often have component: null or 'Layout'.
                    component: null,
                    menuType: 'M',
                    perms: 'store:product:list',
                    icon: 'icon-park-outline:shop',
                    children: [
                        {
                            menuId: 2211,
                            menuName: '商品列表', // store_product_list
                            path: '/store/product/list',
                            component: 'view.store_product_list',
                            menuType: 'C',
                            perms: 'store:product:list:view'
                        },
                        {
                            menuId: 2212,
                            menuName: '商品市场', // store_product_market
                            path: '/store/product/market',
                            component: 'view.store_product_market',
                            menuType: 'C',
                            perms: 'store:product:market:view'
                        }
                    ]
                },
                {
                    menuId: 2220,
                    menuName: '库存管理', // store_stock
                    path: '/store/stock',
                    component: 'view.store_stock',
                    menuType: 'C',
                    perms: 'store:stock:list',
                    icon: 'icon-park-outline:stock-market'
                }
            ]
        },
        {
            menuId: 2300,
            menuName: '订单中心', // order
            path: '/order',
            component: 'layout.base',
            icon: 'mdi:cart-outline',
            orderNum: 13,
            menuType: 'M',
            children: [
                {
                    menuId: 2301,
                    menuName: '订单列表', // order_list
                    path: '/order/list',
                    component: 'view.order_list',
                    menuType: 'C',
                    perms: 'store:order:list',
                    icon: 'mdi:format-list-bulleted'
                },
                {
                    menuId: 2302,
                    menuName: '订单详情', // order_detail (hidden)
                    path: '/order/detail/:id',
                    component: 'view.order_detail',
                    menuType: 'C',
                    perms: 'store:order:query',
                    visible: '1' // 隐藏
                }
            ]
        },
        {
            menuId: 2400,
            menuName: '财务中心', // finance
            path: '/finance',
            component: 'layout.base',
            icon: 'mdi:currency-usd',
            orderNum: 14,
            menuType: 'M',
            children: [
                {
                    menuId: 2401,
                    menuName: '资金看板', // finance_dashboard
                    path: '/finance/dashboard',
                    component: 'view.finance_dashboard',
                    menuType: 'C',
                    perms: 'store:finance:dashboard',
                    icon: 'mdi:chart-areaspline'
                },
                {
                    menuId: 2402,
                    menuName: '佣金明细', // finance_commission
                    path: '/finance/commission',
                    component: 'view.finance_commission',
                    menuType: 'C',
                    perms: 'store:finance:commission',
                    icon: 'mdi:cash-multiple'
                },
                {
                    menuId: 2403,
                    menuName: '提现审核', // finance_withdrawal
                    path: '/finance/withdrawal',
                    component: 'view.finance_withdrawal',
                    menuType: 'C',
                    perms: 'store:finance:withdrawal',
                    icon: 'mdi:bank-transfer-out'
                },
                {
                    menuId: 2404,
                    menuName: '门店流水', // finance_ledger
                    path: '/finance/ledger',
                    component: 'view.finance_ledger',
                    menuType: 'C',
                    perms: 'store:finance:ledger',
                    icon: 'mdi:book-open-page-variant'
                }
            ]
        }
    ];

    // Helper to flatten and insert
    const flattenMenus = [];
    function processMenu(menu, parentId = 0) {
        const { children, ...data } = menu;
        const item = {
            ...data,
            parentId,
            orderNum: data.orderNum || 0,
            tenantId: '000000',
            isFrame: '1', // 1=No (not external link)
            isCache: '0', // 1=No cache, 0=Cache. Default 0.
            visible: '0', // 0=Show
            status: 'NORMAL',
            delFlag: 'NORMAL',
            createBy: 'admin',
            createTime: new Date(),
            remark: 'Initialized by seed-menus.ts'
        };

        // Adjust menuType if it's 'M' (Directory/Menu) or 'C' (Component/Menu) or 'F' (Button)
        // sys_menu uses M, C, F.
        // M: Directory (often Layout)
        // C: Menu (View)
        // F: Button

        flattenMenus.push(item);

        if (children && children.length > 0) {
            children.forEach(child => processMenu(child, item.menuId));
        }
    }

    menus.forEach(m => processMenu(m));

    console.log(`准备插入 ${flattenMenus.length} 个菜单...`);

    for (const menu of flattenMenus) {
        await prisma.sysMenu.upsert({
            where: { menuId: menu.menuId },
            update: menu,
            create: menu,
        });
        console.log(`Upserted menu: ${menu.menuName} (${menu.menuId})`);
    }

    // Grant permissions to admin role (roleId: 1)
    const roleMenus = flattenMenus.map(m => ({
        roleId: 1,
        menuId: m.menuId
    }));

    console.log('正在更新管理员角色权限...');
    await prisma.sysRoleMenu.createMany({
        data: roleMenus,
        skipDuplicates: true
    });

    // Update Base Tenant Package (packageId: 1) to include new menu IDs
    console.log('正在更新基础租户套餐...');
    const basePackage = await prisma.sysTenantPackage.findUnique({
        where: { packageId: 1 }
    });

    if (basePackage && basePackage.menuIds) {
        const currentIds = basePackage.menuIds.split(',').map(Number);
        const newIds = flattenMenus.map(m => m.menuId);
        const combinedIds = Array.from(new Set([...currentIds, ...newIds])).join(',');

        await prisma.sysTenantPackage.update({
            where: { packageId: 1 },
            data: { menuIds: combinedIds }
        });
        console.log('基础租户套餐(ID: 1)已更新。');
    }

    console.log('菜单同步完成！');
}

main()
    .catch((e) => {
        console.error('Seed execution failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
