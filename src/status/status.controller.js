const Status = require('./status.model');


exports.createStatus = async (req, res) => {
    if (!req.body.name) {
        return res.status(400).send({
            message: "name is required!"
        });
    }

    try {

        // Check if status exists
        const statusExists = await Status.query()
            .where({
                name: req.body.name
            }).first();

        if (statusExists) {
            return res.status(400).send({
                message: "Failed! Status already exists!"
            });
        }

        const payload = {
            name: req.body.name,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }

        const status = await Status.query().insert(payload);

        return res.status(201).send({
            message: "Status was created successfully!",
            data: {
                id: status.id,
                name: status.name
            }
        });

    } catch (error) {
        return res.status(500).send({
            message: "Internal server error"
        });
    }

}

exports.getStatusById = async (req, res) => {
    const { id } = req.params;

    try {
        const status = await Status.query().findById(id);

        if (!status) {
            return res.status(404).json({ error: 'Status not found' });
        }

        res.status(200).json(status);

    } catch (error) {
        return res.status(500).send({
            message: "Internal server error"
        });
    }

}

exports.getAllStatus = async (req, res) => {

    try {
        const allstatus = await Status.query();

        res.status(200).json(allstatus);

    } catch (error) {
        return res.status(500).send({
            message: "Internal server error"
        });
    }

}

// TODO : Update Status
// TODO : Delete Status