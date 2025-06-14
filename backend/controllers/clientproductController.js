// controllers/productController.js
const ClientProduct = require("../models/ClientProduct");
const stripe = require('stripe')(process.env.STRIPE_KEY);

// Create a new product with an image
exports.createProduct = async (req, res) => {
  try {
    // Ensure userId is a single string value
    const userId = Array.isArray(req.body.userId) 
      ? req.body.userId[0] 
      : req.body.userId;

    if (!userId) {
      return res.status(401).json({ 
        message: "User ID is required", 
        error: "No user authentication found" 
      });
    }

    const { 
      names, 
      id, 
      phoneNumber, 
      email, 
      cooperativeName, 
      location, 
      productType, 
      plantTime, 
      harvestTime, 
      priceSoldAt, 
      needLogistic 
    } = req.body;

    const imageUrl = req.file ? `uploads/${req.file.filename}` : null;

    const newProduct = new ClientProduct({
      userId, // Use the single userId value
      names,
      id,
      phoneNumber,
      email,
      cooperativeName,
      location,
      productType,
      plantTime,
      harvestTime,
      priceSoldAt,
      needLogistic: needLogistic === 'true' || needLogistic === true,
      image: imageUrl,
    });

    await newProduct.save();
    res.status(201).json({ 
      message: "Product created successfully!", 
      product: newProduct 
    });
  } catch (error) {
    console.error("Product creation error:", error);
    res.status(500).json({ 
      message: "Error creating product", 
      error: error.message 
    });
  }
};


// Get all products
exports.getAllProducts = async (req, res) => {
  try {
    const products = await ClientProduct.find();
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: "Error fetching products", error: error.message });
  }
};

// Get a single product by ID
exports.getProductById = async (req, res) => {
  try {
    const product = await ClientProduct.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: "Error fetching product", error: error.message });
  }
};

// Update a product by ID
exports.updateProduct = async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    // Handle image update if a new file is uploaded
    if (req.file) {
      updateData.image = `uploads/${req.file.filename}`;
    }

    const updatedProduct = await ClientProduct.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json({ message: "Product updated successfully!", product: updatedProduct });
  } catch (error) {
    res.status(500).json({ message: "Error updating product", error: error.message });
  }
};

// Delete a product by ID
exports.deleteProduct = async (req, res) => {
  try {
    const deletedProduct = await ClientProduct.findByIdAndDelete(req.params.id);
    if (!deletedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json({ message: "Product deleted successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting product", error: error.message });
  }
};

exports.updateProductStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentAmount } = req.body;

    if (!['pending', 'accepted', 'rejected', 'paid'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Invalid status. Status must be either 'pending', 'accepted', 'rejected', or 'paid'"
      });
    }

    let updateData = { status };

    if (status === 'accepted') {
      updateData.acceptedDate = new Date();
      updateData.paymentStatus = 'pending';
    }

    if (status === 'paid') {
      if (!paymentAmount) {
        return res.status(400).json({
          success: false,
          error: "Payment amount is required for paid status"
        });
      }
      updateData.paymentStatus = 'completed';
      updateData.paymentAmount = paymentAmount;
      updateData.paymentDate = new Date();
    }

    const product = await ClientProduct.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found"
      });
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Server Error"
    });
  }
};

// Add new Stripe payment endpoint
exports.createPaymentIntent = async (req, res) => {
  try {
    const { productId, amount, currency = 'usd' } = req.body;

    // Verify the product exists
    const product = await ClientProduct.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe uses cents
      currency: currency,
      metadata: {
        productId: productId,
        userId: product.userId.toString()
      }
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: error.message });
  }
};

// Add endpoint to confirm payment and update product status
exports.confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId, productId } = req.body;

    // Verify the payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment not succeeded' });
    }

    // Update the product status
    const product = await ClientProduct.findByIdAndUpdate(
      productId,
      {
        status: 'paid',
        paymentStatus: 'completed',
        paymentAmount: paymentIntent.amount / 100, // Convert back to dollars
        paymentDate: new Date()
      },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ error: error.message });
  }
};

// Add a new endpoint to get payment status
exports.getPaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    const product = await ClientProduct.findById(id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found"
      });
    }

    res.status(200).json({
      success: true,
      data: {
        status: product.status,
        paymentStatus: product.paymentStatus,
        paymentAmount: product.paymentAmount,
        paymentDate: product.paymentDate,
        acceptedDate: product.acceptedDate
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Server Error"
    });
  }
};
// Get products by User ID
exports.getProductsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    // Fetch products associated with the given user ID
    const products = await ClientProduct.find({ userId: userId });

    if (!products || products.length === 0) {
      return res.status(404).json({ message: "No products found for this user" });
    }

    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: "Error fetching products by user", error: error.message });
  }
};
