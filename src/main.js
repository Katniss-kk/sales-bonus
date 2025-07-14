/**
 * Функция для расчета прибыли от одной позиции в покупке
 * @param purchase запись о покупке (одна позиция)
 * @param _product карточка товара
 * @returns {number} прибыль по позиции
 */
function calculateSimpleRevenue(purchase, _product) {
    const { discount = 0, sale_price = 0, quantity = 0 } = purchase;
    const { purchase_price = 0 } = _product;
    // Выручка с учетом скидки минус себестоимость, умноженная на количество
    return (sale_price * (1 - discount / 100) - purchase_price) * quantity;
}

/**
 * Функция для расчета бонусного коэффициента
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца (не используется, но оставлен для совместимости)
 * @returns {number} бонусный коэффициент
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
    }
}

/**
 * Функция для анализа данных продаж
 * @param data входные данные
 * @param options опции (не используются)
 * @returns {Array} массив с результатами анализа по продавцам
 */
function analyzeSalesData(data, options = {}) {
    if (!data?.sellers?.length || !data?.products?.length || !data?.purchase_records?.length) {
        throw new Error('Некорректные входные данные');
    }

    // Создаем индексы для быстрого доступа
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

    // Обрабатываем все записи о покупках
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        if (!seller) return;

        seller.sales_count += 1;
        seller.revenue += record.total_amount;

        // Обрабатываем каждую позицию в покупке
        record.items.forEach(item => {
            const product = productIndex[item.sku];
            if (!product) return;

            const profit = calculateSimpleRevenue(item, product);
            seller.profit += profit;

            // Учитываем количество проданных товаров
            seller.products_sold[item.sku] = (seller.products_sold[item.sku] || 0) + item.quantity;
        });
    });

    // Фильтруем и сортируем продавцов по прибыли
    const sortedSellers = Object.values(sellerIndex)
        .filter(seller => seller.sales_count > 0)
        .sort((a, b) => b.profit - a.profit);

    // Назначаем бонусы
    sortedSellers.forEach((seller, index) => {
        seller.bonus = calculateBonusByProfit(index, sortedSellers.length, seller);
    });

    // Формируем итоговый результат
    return sortedSellers.map(seller => ({
        seller_id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: parseFloat(seller.revenue.toFixed(2)),
        profit: parseFloat(seller.profit.toFixed(2)),
        sales_count: seller.sales_count,
        top_products: Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10),
        bonus: parseFloat((seller.bonus * seller.profit).toFixed(2))
    }));
}