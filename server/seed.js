const bcrypt = require('bcryptjs');
const { User, Product, Customer, Order, Category, Supplier } = require('./models'); // Adjust path as necessary
const { sequelize } = require('./config/database'); // Adjust path as necessary

const seedDatabase = async () => {
    try {
        await sequelize.sync({ force: true }); // This will drop and recreate tables
        console.log('Database synced!');

        // Seed Users
        const users = await User.bulkCreate([
            { 
                username: 'admin', 
                password_hash: await bcrypt.hash('password123', 10), 
                role: 'admin', 
                email: 'admin@example.com', 
                nickname: 'Administrator',
                status: 'active',
                last_login_at: new Date()
            },
            { 
                username: 'staff1', 
                password_hash: await bcrypt.hash('password123', 10), 
                role: 'sales', // Assuming 'staff' maps to 'sales' or you adjust roles
                email: 'staff1@example.com', 
                nickname: 'Staff Member 1',
                status: 'active',
                last_login_at: new Date()
            },
            { 
                username: 'staff2', 
                password_hash: await bcrypt.hash('password123', 10), 
                role: 'sales', // Assuming 'staff' maps to 'sales' or you adjust roles
                email: 'staff2@example.com', 
                nickname: 'Staff Member 2',
                status: 'inactive',
                last_login_at: null
            },
        ], { individualHooks: true }); // Ensure hooks run for password hashing if not pre-hashed
        console.log('Users seeded!');

        // 创建客户
        const customers = await Customer.bulkCreate([
            { name: '北京协和医院', contact_person: '李医生', phone: '13800138000', email: 'xiehe@example.com', address: '北京市东城区帅府园1号' },
            { name: '上海瑞金医院', contact_person: '王主任', phone: '13900139000', email: 'ruijin@example.com', address: '上海市黄浦区瑞金二路197号' },
            { name: '广州南方医院', contact_person: '张护士', phone: '13700137000', email: 'nanfang@example.com', address: '广州市白云区广州大道北1838号' },
            { name: '深圳人民医院', contact_person: '刘药师', phone: '13600136000', email: 'renmin@example.com', address: '深圳市罗湖区东门北路1017号' },
            { name: '社区卫生服务中心A', contact_person: '赵医生', phone: '13500135000', email: 'shequA@example.com', address: '某市某区某街道1号' },
            { name: '社区卫生服务中心B', contact_person: '钱医生', phone: '13400134000', email: 'shequB@example.com', address: '某市某区某街道2号' },
        ]);
        console.log('客户已创建');

        // 创建产品
        const products = await Product.bulkCreate([
            { name: 'N95口罩', category: '防护用品', description: '高效过滤颗粒物，医用级别', price: 15.00, stock: 500, supplier: '3M中国有限公司', alert_stock: 50 },
            { name: '医用外科口罩', category: '防护用品', description: '三层防护，细菌过滤效率高', price: 2.50, stock: 2000, supplier: '稳健医疗用品股份有限公司', alert_stock: 200 },
            { name: '75%酒精消毒液', category: '消毒用品', description: '500ml瓶装，有效杀灭病毒细菌', price: 25.00, stock: 300, supplier: '利尔康医疗科技有限公司', alert_stock: 30 },
            { name: '免洗手消毒凝胶', category: '消毒用品', description: '60ml便携装，随时随地消毒', price: 12.00, stock: 800, supplier: '蓝月亮（中国）有限公司', alert_stock: 100 },
            { name: '电子体温计', category: '医疗器械', description: '红外线额温枪，快速准确', price: 80.00, stock: 150, supplier: '鱼跃医疗设备股份有限公司', alert_stock: 20 },
            { name: '血糖仪套装', category: '医疗器械', description: '含血糖仪、试纸、采血针', price: 280.00, stock: 80, supplier: '罗氏诊断产品（上海）有限公司', alert_stock: 10 },
            { name: '创可贴（防水型）', category: '医疗耗材', description: '100片装，透气防水', price: 18.00, stock: 1000, supplier: '云南白药集团股份有限公司', alert_stock: 150 },
            { name: '医用棉签', category: '医疗耗材', description: '200支/包，消毒级', price: 5.00, stock: 1500, supplier: '奥美医疗用品股份有限公司', alert_stock: 200 },
            { name: '一次性注射器', category: '医疗耗材', description: '5ml, 带针头，无菌', price: 1.50, stock: 3000, supplier: '山东威高集团医用高分子制品股份有限公司', alert_stock: 300 },
            { name: '医用纱布块', category: '医疗耗材', description: '8层，10cm x 10cm，灭菌', price: 3.00, stock: 600, supplier: '河南飘安集团有限公司', alert_stock: 50 },
        ]);
        console.log('产品已创建');

        // 创建订单和订单项
        const ordersData = [
            {
                customer_id: customers[0].id, // 北京协和医院
                user_id: users[1].id, // staff1
                order_date: new Date('2023-05-15'),
                status: 'completed',
                total_price: 0, // 稍后计算
                items: [
                    { product_id: products[0].id, quantity: 50, unit_price: products[0].price }, // N95口罩
                    { product_id: products[2].id, quantity: 20, unit_price: products[2].price }, // 75%酒精消毒液
                ]
            },
            {
                customer_id: customers[1].id, // 上海瑞金医院
                user_id: users[2].id, // staff2
                order_date: new Date('2023-05-20'),
                status: 'pending',
                total_price: 0,
                items: [
                    { product_id: products[1].id, quantity: 200, unit_price: products[1].price }, // 医用外科口罩
                    { product_id: products[4].id, quantity: 10, unit_price: products[4].price }, // 电子体温计
                ]
            },
            {
                customer_id: customers[0].id, // 北京协和医院
                user_id: users[1].id, // staff1
                order_date: new Date('2023-06-01'),
                status: 'processing',
                total_price: 0,
                items: [
                    { product_id: products[6].id, quantity: 100, unit_price: products[6].price }, // 创可贴
                    { product_id: products[7].id, quantity: 50, unit_price: products[7].price },  // 医用棉签
                ]
            },
            {
                customer_id: customers[3].id, // 深圳人民医院
                user_id: users[1].id, // staff1
                order_date: new Date(),
                status: 'completed',
                total_price: 0,
                items: [
                    { product_id: products[0].id, quantity: 100, unit_price: products[0].price }, // N95口罩
                    { product_id: products[1].id, quantity: 500, unit_price: products[1].price }, // 医用外科口罩
                    { product_id: products[8].id, quantity: 1000, unit_price: products[8].price }, // 一次性注射器
                ]
            },
            {
                customer_id: customers[4].id, // 社区卫生服务中心A
                user_id: users[2].id, // staff2
                order_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3天前
                status: 'completed',
                total_price: 0,
                items: [
                    { product_id: products[3].id, quantity: 30, unit_price: products[3].price }, // 免洗手消毒凝胶
                    { product_id: products[5].id, quantity: 5, unit_price: products[5].price },  // 血糖仪套装
                ]
            },
        ];

        for (const orderData of ordersData) {
            let calculatedTotalPrice = 0;
            for (const item of orderData.items) {
                calculatedTotalPrice += item.quantity * item.unit_price;
            }
            orderData.total_price = calculatedTotalPrice;

            const order = await Order.create({
                customer_id: orderData.customer_id,
                user_id: orderData.user_id,
                order_date: orderData.order_date,
                status: orderData.status,
                total_price: orderData.total_price,
            });

            const orderItems = orderData.items.map(item => ({
                ...item,
                order_id: order.id
            }));
            await OrderItem.bulkCreate(orderItems);

            // 更新库存和客户消费额 (简化版，实际应在订单服务中处理)
            for (const item of orderData.items) {
                const product = await Product.findByPk(item.product_id);
                if (product) {
                    product.stock -= item.quantity;
                    await product.save();
                }
            }
            const customer = await Customer.findByPk(orderData.customer_id);
            if (customer) {
                customer.total_spent = (customer.total_spent || 0) + orderData.total_price;
                await customer.save();
            }
        }
        console.log('订单和订单项已创建');

        console.log('数据库填充完成！');
    } catch (error) {
        console.error('填充数据库时出错:', error);
    } finally {
        await sequelize.close();
    }
};

seedDatabase();