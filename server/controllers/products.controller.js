const { ref, uploadBytes, getDownloadURL } = require("firebase/storage");

const { Product } = require("../models/product.model");
const { ProductImg } = require("../models/productImg.model");

const { catchAsync } = require("../utils/catchAsync.util");
const { storage } = require("../utils/firebase.util");
const fs = require("fs");
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
        const image = req.files.image;
        const uploadPath = path.join(__dirname, "uploads", image.name);

        image.mv(uploadPath, async err => {
            if (err) {
                return res.status(500).send(err);
            }

            // Sube la imagen al almacenamiento de Firebase
            const remotePath = `imagesproduct/${image.name}`;
            const dataImage = await bucket.upload(uploadPath, {
                destination: remotePath,
            });
            console.log("dataImage", dataImage);

            // Elimina el archivo local después de subirlo a Firebase
            fs.unlinkSync(uploadPath);

            res.send("Imagen subida y almacenada en Firebase exitosamente");
        });
        // const filesPromises = req.files.map(async file => {
        //     const imgRef = ref(
        //         storage,
        //         `imagesproduct/${Date.now()}_${file.originalname}`
        //     );
        //     const imgRes = await uploadBytes(imgRef, file.buffer);

        //     await ProductImg.create({
        //         productId: newProduct.id,
        //         imgUrl: imgRes.metadata.fullPath,
        //     });
        // });

        // await Promise.all(filesPromises);
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
                    const imgRef = ref(storage, productImg.imgUrl);

                    const imgFullPath = await getDownloadURL(imgRef);

                    productImg.imgUrl = imgFullPath;
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
        const imgRef = ref(storage, productImg.imgUrl);

        const imgFullPath = await getDownloadURL(imgRef);

        productImg.imgUrl = imgFullPath;
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
};
