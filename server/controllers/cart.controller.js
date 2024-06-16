const { ProductsinCart } = require("../models/productsinCart.model");
const { Product } = require("../models/product.model");
const { Cart } = require("../models/cart.model");
const { Order } = require("../models/order.model");

const { catchAsync } = require("../utils/catchAsync.util");
const { AppError } = require("../utils/appError.util");
const { ProductImg } = require("../models/productImg.model");

const { Hash } = require("@smithy/hash-node");
const { parseUrl } = require("@smithy/url-parser");
const { HttpRequest } = require("@smithy/protocol-http");
const { S3RequestPresigner } = require("@aws-sdk/s3-request-presigner");
const { formatUrl } = require("@aws-sdk/util-format-url");

const region = process.env.REGION;
const credentials = {
    accessKeyId: process.env.ACCESS_KEY_ID_S3,
    secretAccessKey: process.env.SECRET_ACCESS_KEY_S3,
};

const createproductsinCart = catchAsync(async (req, res, next) => {
    const { sessionUser } = req;
    const { productId, quantity } = req.body;

    const product = await Product.findOne({
        where: { id: productId, status: "active" },
    });

    if (!product) {
        return next(new AppError("Invalid product do not exist", 404));
    } else if (quantity > product.quantity) {
        return next(
            new AppError(
                `This product only has ${product.quantity} items available`,
                400
            )
        );
    }

    const cart = await Cart.findOne({
        where: { status: "active", userId: sessionUser.id },
    });

    if (!cart) {
        const newCart = await Cart.create({ userId: sessionUser.id });

        await ProductsinCart.create({
            cartId: newCart.id,
            productId,
            quantity,
        });
    } else {
        const productExists = await ProductsinCart.findOne({
            where: { cartId: cart.id, productId, status: "active" },
        });

        if (productExists) {
            return next(new AppError("Product is already in the cart", 400));
        }

        await ProductsinCart.create({ cartId: cart.id, productId, quantity });
    }

    res.status(200).json({ status: "success" });
});

const getAllproductsinCart = catchAsync(async (req, res, next) => {
    const productsinCarts = await ProductsinCart.findAll({
        where: { status: "active" },
        include: [
            {
                model: Product,
                include: [
                    {
                        model: ProductImg,
                        attributes: ["id", "imgUrl"],
                        limit: 1, // Traer solo la primera imagen
                    },
                ],
            },
        ],
    });

    const newProdsInCart = productsinCarts.map(async productInCart => {
        const product = productInCart.Product;
        if (product.ProductImgs.length > 0) {
            const productImg = product.ProductImgs[0]; // Solo la primera imagen
            if (productImg.imgUrl) {
                const url = parseUrl(productImg.imgUrl);
                const presigner = new S3RequestPresigner({
                    credentials,
                    region,
                    sha256: Hash.bind(null, "sha256"),
                });
                const signedUrlObject = await presigner.presign(
                    new HttpRequest(url)
                );
                productImg.imgUrl = formatUrl(signedUrlObject);
            }
        }
        return productInCart;
    });

    await Promise.all(newProdsInCart);

    res.status(200).json({
        status: "success",
        productsinCarts,
    });
});

const getPurchases = catchAsync(async (req, res, next) => {
    const { sessionUser } = req;

    const purchases = await Order.findAll({
        where: { userId: sessionUser.id },
        include: [
            {
                model: Cart,

                include: [
                    { model: ProductsinCart, include: [{ model: Product }] },
                ],
            },
        ],
    });

    res.status(200).json({
        status: "success",
        purchases,
    });
});

const getPurchasesById = catchAsync(async (req, res, next) => {
    const { order, sessionUser } = req;

    const purchases = await Order.findOne({
        where: { id: order.id, userId: sessionUser.id },
        include: [
            {
                model: Cart,
                include: [
                    { model: ProductsinCart, include: [{ model: Product }] },
                ],
            },
        ],
    });

    res.status(200).json({
        status: "success",
        purchases,
    });
});

const updateproductsinCart = catchAsync(async (req, res, next) => {
    const { sessionUser } = req;
    const { productId, quantity } = req.body;

    const cart = await Cart.findOne({
        where: { userId: sessionUser.id, status: "active" },
    });

    if (!cart) {
        return next(new AppError("Cart not found", 404));
    } else {
        const productExists = await ProductsinCart.findOne({
            where: { cartId: cart.id, productId },
        });

        if (!productExists) {
            return next(new AppError("Product is not in the cart", 400));
        } else {
            const product = await Product.findOne({
                where: { id: productId, status: "active" },
            });

            if (quantity > product.quantity) {
                return next(
                    new AppError(
                        `This product only has ${product.quantity} items available`,
                        400
                    )
                );
            } else {
                if (quantity === 0) {
                    await ProductsinCart.update(
                        { status: "removed" },
                        { where: { cartId: cart.id, productId } }
                    );
                } else {
                    await ProductsinCart.update(
                        { quantity, status: "active" },
                        { where: { cartId: cart.id, productId } }
                    );
                }
            }
        }
    }

    res.status(200).json({ status: "success" });
});

const deleteproductsinCart = catchAsync(async (req, res, next) => {
    const { sessionUser } = req;
    const { id } = req.params;

    const cart = await Cart.findOne({
        where: { userId: sessionUser.id, status: "active" },
    });
    if (!cart) {
        return next(new AppError("Cart not found", 404));
    } else {
        const productExists = await ProductsinCart.findOne({
            where: { cartId: cart.id, productId: id },
        });
        if (!productExists) {
            return next(new AppError("Product is not in the cart", 400));
        } else {
            await productExists.update({ status: "removed" });
            res.status(200).json({ status: "success" });
        }
    }
});

const postCartPurchase = catchAsync(async (req, res, next) => {
    const { sessionUser } = req;

    const cart = await Cart.findOne({
        where: { userId: sessionUser.id, status: "active" },
        include: [
            {
                model: ProductsinCart,
                where: { status: "active" },
                include: { model: Product },
            },
        ],
    });

    if (!cart) {
        return next(new AppError("Cart not found", 404));
    }

    let totalPrice = 0;

    const productsPurchasedPromises = cart.productsinCarts.map(
        async productInCart => {
            const newQty =
                productInCart.product.quantity - productInCart.quantity;

            const productPrice =
                productInCart.quantity * +productInCart.product.price;

            totalPrice += productPrice;

            await productInCart.product.update({ quantity: newQty });

            await cart.update({ status: "inactive" });

            return await productInCart.update({ status: "purchased" });
        }
    );

    await Promise.all(productsPurchasedPromises);

    const newOrder = await Order.create({
        cartId: cart.id,
        userId: sessionUser.id,
        totalPrice: totalPrice,
    });

    res.status(200).json({
        status: "success",
        newOrder,
    });
});

module.exports = {
    createproductsinCart,
    getAllproductsinCart,
    updateproductsinCart,
    deleteproductsinCart,
    postCartPurchase,
    getPurchases,
    getPurchasesById,
};
