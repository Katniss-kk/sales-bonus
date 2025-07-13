/**
 * Функция для расчета прибыли
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const { discount, sale_price, quantity } = purchase;
    const { purchase_price = 0 } = _product;
    return sale_price * quantity * (1 - discount / 100) - purchase_price * quantity;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    if (index === 0) {
    return 0.15;
} else if (index === 1 || index === 2) {
    return 0.10;
} else if (index === total - 1) {
    return 0;
} else {
    return 0.05;
}}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options = {}) {
    if (!data?.sellers?.length || !data?.products?.length || !data?.purchase_records?.length) {
        throw new Error('Некорректные входные данные');
    }

    // Создаем индексы
    const productIndex = data.products.reduce((acc, product) => {
        acc[product.sku] = product;
        return acc;
    }, {});

    const sellerIndex = data.sellers.reduce((acc, seller) => {
        acc[seller.id] = {
            ...seller,
            revenue: 0,
            profit: 0,
            sales_count: 0,
            products_sold: {}
        };
        return acc;
    }, {});

    // Обрабатываем покупки
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        if (!seller) return;

        seller.sales_count += 1;

        record.items.forEach(item => {
            const product = productIndex[item.sku];
            if (!product) return;

            seller.revenue += item.sale_price * item.quantity * (1 - (item.discount || 0) / 100);
            seller.profit += calculateSimpleRevenue(item, product);

            seller.products_sold[item.sku] = (seller.products_sold[item.sku] || 0) + item.quantity;
        });
    });

    // Сортируем по прибыли
    const sortedSellers = Object.values(sellerIndex)
        .filter(s => s.sales_count > 0)
        .sort((a, b) => b.profit - a.profit);

    // Назначаем бонусы
    sortedSellers.forEach((seller, index) => {
        seller.bonus = calculateBonusByProfit(index, sortedSellers.length, seller);
    });

    // Формируем результат
    return sortedSellers.map(seller => ({
        seller_id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10),
        bonus: +(seller.bonus * seller.profit).toFixed(2)
    }));
}