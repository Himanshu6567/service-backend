const ServiceInitial = require("../Models/ServiceInitialSchema");

const handleGetAllInntialService = async (req, res) => {
  try {
    const services = await ServiceInitial.find({});
   
    return res.status(201).json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  handleGetAllInntialService,
};
