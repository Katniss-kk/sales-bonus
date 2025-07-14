/**
 * Функция для расчета прибыли от одной позиции в покупке
 * @param purchase запись о покупке (одна позиция)
 * @param _product карточка товара
 * @returns {number} прибыль по позиции
 */
function calculateSimpleRevenue(purchase, _product) {
    const { discount = 0, sale_price = 0, quantity = 0 } = purchase;
    const { purchase_price = 0 } = _product;
    
    return (sale_price * (1 - (discount / 100))) * quantity;
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
        return 150; // 150%
    } else if (index === 1 || index === 2) {
        return 100; // 100%
    } else if (index === total - 1) {
        return 0;
    } else {
        return 50; // 50%
    }
}

/**
 * Функция для анализа данных продаж
 * @param data входные данные
 * @param options опции (не используются)
 * @returns {Array} массив с результатами анализа по продавцам
 */
function analyzeSalesData(data, options = {}) {
    if (!data ||
        !Array.isArray(data.sellers) ||
        !Array.isArray(data.products) ||
        !Array.isArray(data.purchase_records) ||
        data.sellers.length === 0 ||
        data.products.length === 0 ||
        data.purchase_records.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    }
     if (typeof options !== 'object' || options === null) {
        throw new Error('Опции должны быть объектом');
    }

    const { calculateRevenue, calculateBonus } = options;

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

            cost = product.purchase_price * item.quantity
            const revenue = calculateSimpleRevenue(item, product)
            const profit = revenue - cost
            seller.profit += profit

            // Учитываем количество проданных товаров
            seller.products_sold[item.sku] = (seller.products_sold[item.sku] || 0) + item.quantity;
            
        });
    });

    // Фильтруем и сортируем продавцов по прибыли
    const sellerStats = Object.values(sellerIndex)
        .filter(seller => seller.sales_count > 0)
        .sort((a, b) => b.profit - a.profit);

    // Назначаем бонусы
    sellerStats.forEach((seller, index) => {
        const bonusRate = calculateBonusByProfit(index, sellerStats.length, seller);
        seller.bonus = (bonusRate * seller.profit / 1000);
        
        // Формируем топ-10 товаров
        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });

    // Формируем итоговый результат
    return sellerStats.map(seller => ({
        seller_id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2)
    }));
}