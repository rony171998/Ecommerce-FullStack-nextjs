// Models
const { User } = require("../models/user.model");
const { Order } = require("../models/order.model");
const { Product } = require("../models/product.model");
const { ProductImg } = require("../models/productImg.model");

// Utils
const { catchAsync } = require("../utils/catchAsync.util");
const { AppError } = require("../utils/appError.util");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { credentials, region } = require("../controllers/products.controller");
const { parseUrl } = require("@smithy/url-parser");
const { S3RequestPresigner } = require("@aws-sdk/s3-request-presigner");
const { formatUrl } = require("@aws-sdk/util-format-url");
const { Hash } = require("@smithy/hash-node");
const { HttpRequest } = require("@smithy/protocol-http");

//Gen secrets for JWT, require('crypto').randomBytes(64).toString('hex')

const getMeProducts = catchAsync(async (req, res, next) => {
    const { sessionUser } = req;
    const user = await User.findOne({
        where: { id: sessionUser.id, status: "active" },
        include: [
            {
                model: Product,

                include: [
                    {
                        model: ProductImg,
                        attributes: ["id", "imgUrl"],
                    },
                ],
            },
        ],
    });

    const newpro = user.products.map(async product => {
        if (product.productImgs.length > 0) {
            const productImgsPromises = product.productImgs.map(
                async productImg => {
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
            );
            await Promise.all(productImgsPromises);
        }
    });
    await Promise.all(newpro);

    res.status(200).json({
        status: "success",
        user,
    });
});

const createUser = catchAsync(async (req, res, next) => {
    const { name, email, password, role } = req.body;

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
        name,
        email,
        password: hashedPassword,
        role,
    });

    newUser.password = undefined;

    res.status(201).json({
        status: "success",
        newUser,
    });
});

const login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    // Validate credentials (email)
    const user = await User.findOne({
        where: {
            email,
            status: "active",
        },
    });

    if (!user) {
        return next(new AppError("Credentials invalid", 400));
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
        return next(new AppError("Credentials invalid", 400));
    }

    // Generate JWT (JsonWebToken) ->
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
        expiresIn: "30d",
    });

    // Send response
    res.status(200).json({
        status: "success",
        token,
    });
});

const getUserById = catchAsync(async (req, res, next) => {
    const { user } = req;

    res.status(200).json({
        status: "success",
        user,
    });
});

const updateUser = catchAsync(async (req, res, next) => {
    const { user } = req;
    const { name, email } = req.body;

    await user.update({ name, email });

    res.status(200).json({ status: "success" });
});

const deleteUser = catchAsync(async (req, res, next) => {
    const { user } = req;

    await user.update({ status: "deleted" });

    res.status(200).json({ status: "success" });
});

const getUserOrdersAll = catchAsync(async (req, res, next) => {
    const { sessionUser } = req;

    const orders = await Order.findAll({
        where: { userId: sessionUser.id, status: "active" },
    });

    res.status(200).json({
        status: "success",
        orders,
    });
});

const getAllorders = catchAsync(async (req, res, next) => {
    const orders = await Order.findAll();

    res.status(200).json({
        status: "success",
        orders,
    });
});

const getUserOrderById = catchAsync(async (req, res, next) => {
    const { order } = req;

    res.status(200).json({ status: "success", order });
});

module.exports = {
    getMeProducts,
    createUser,
    login,
    getUserById,
    updateUser,
    deleteUser,
    getUserOrdersAll,
    getUserOrderById,
    getAllorders,
};
