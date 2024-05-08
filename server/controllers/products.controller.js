const { Product } = require("../models/product.model");
const { ProductImg } = require("../models/productImg.model");

const { catchAsync } = require("../utils/catchAsync.util");

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { Hash } = require("@smithy/hash-node");
const { parseUrl } = require("@smithy/url-parser");
const { fromIni } = require("@aws-sdk/credential-provider-node");
const { HttpRequest } = require("@smithy/protocol-http");
const { S3RequestPresigner } = require("@aws-sdk/s3-request-presigner");
const { formatUrl } = require("@aws-sdk/util-format-url");
const axios = require("axios");

const region = process.env.REGION;
const credentials = {
    accessKeyId: process.env.ACCESS_KEY_ID_S3,
    secretAccessKey: process.env.SECRET_ACCESS_KEY_S3,
};

const createProduct = catchAsync(async (req, res, next) => {
    const { title, description, price, categoryId, quantity } = req.body;
    const { sessionUser } = req;

    const newProduct = await Product.create({
        title,
        description,
        price,
        categoryId,
        quantity,
        userId: sessionUser.id,
    });

    if (req.files.length > 0) {
        const client = new S3Client({
            region,
            credentials,
        }); // Reemplaza "TU_REGION" con tu región de AWS S3
        const Bucket = "mybucket-smart-mark"; // Reemplaza "NOMBRE_DE_TU_BUCKET" con el nombre de tu bucket en AWS S3
        const filesPromises = req.files.map(async file => {
            const Key = `imagesproduct/${Date.now()}_${file.originalname}`; // Ruta dentro del bucket donde se almacenará la imagen

            const command = new PutObjectCommand({
                Bucket,
                Key,
                Body: file.buffer,
            });

            //const response = await client.send(command);
            // ProductImg.create({
            //     productId: newProduct.id,
            //     imgUrl: `https://${Bucket}.s3.${region}.amazonaws.com/${Key}`, // Guarda la URL generada en la base de datos
            // })

            let config = {
                method: "post",
                maxBodyLength: Infinity,
                url: "https://7oco9rm1ri.execute-api.us-east-2.amazonaws.com/stage-lambda",
                headers: {
                    "x-api-key": "EBwQLlJpYu14Xe6VcLbqe7TrouBpPBMU7Xk2rc7X",
                    "Content-Type": file.mimetype,
                },
                data: file.buffer,
            };

            axios.request(config).then(response => {
                ProductImg.create({
                    productId: newProduct.id,
                    imgUrl: `https://${Bucket}.s3.${region}.amazonaws.com/${response.data.key}`, // Guarda la URL generada en la base de datos
                });
            });
        });

        await Promise.all(filesPromises);
    }

    const productImgs = await ProductImg.findAll({
        where: {
            productId: newProduct.id,
        },
    });

    res.status(201).json({
        status: "success",
        newProduct,
        productImgs,
    });
});

const getAllProduct = catchAsync(async (req, res, next) => {
    const products = await Product.findAll({
        where: { status: "active" },
        include: [
            {
                model: ProductImg,
                attributes: ["id", "imgUrl"],
            },
        ],
    });

    const newpro = products.map(async product => {
        if (product.productImgs.length > 0) {
            const productImgsPromises = product.productImgs.map(
                async productImg => {
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
            );
            await Promise.all(productImgsPromises);
        }
    });
    await Promise.all(newpro);

    res.status(200).json({
        status: "success",
        products,
    });
});

const getProductById = catchAsync(async (req, res, next) => {
    const { product } = req;

    const productImgs = await ProductImg.findAll({
        where: { productId: product.id },
    });

    const productImgsPromises = productImgs.map(async productImg => {
        const url = parseUrl(productImg.imgUrl);

        const presigner = new S3RequestPresigner({
            credentials,
            region,
            sha256: Hash.bind(null, "sha256"),
        });
        const signedUrlObject = await presigner.presign(new HttpRequest(url));

        productImg.imgUrl = formatUrl(signedUrlObject);
    });

    await Promise.all(productImgsPromises);

    res.status(200).json({
        status: "success",
        product,
        productImgs,
    });
});

const updateProduct = catchAsync(async (req, res, next) => {
    const { product } = req;
    const { title, description, price, quantity } = req.body;

    await product.update({ title, description, price, quantity });

    res.status(200).json({ status: "success", product });
});

const deleteProduct = catchAsync(async (req, res, next) => {
    const { product } = req;

    await product.update({ status: "deleted" });

    res.status(200).json({ status: "success" });
});

module.exports = {
    createProduct,
    getAllProduct,
    updateProduct,
    deleteProduct,
    getProductById,
    region,
    credentials,
};
