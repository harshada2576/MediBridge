const userModel = require('../models/userModel');

exports.getAllUsers = async (req, res) => {
  try {
    const users = await userModel.getAllUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addUser = async (req, res) => {
  try {
    const { name, email } = req.body;
    const userId = await userModel.addUser(name, email);
    res.json({ id: userId, name, email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
