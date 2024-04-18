const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require("dotenv").config();

const { DATABASE_URL } = process.env;

const app = express()
app.use(cors());
app.use(express.json());

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    }
});

async function getPostgresVersion() {
    const client = await pool.connect();

    try {

        const response = await client.query("SELECT version()");
        console.log(response.rows)

    } catch (err) {

        console.error(err.message)

    } finally {

        client.release();

    }
}

getPostgresVersion();

//////////////BEGINNING//////////////
//ENDPOINT TO ADD USER FROM FIREBASE

app.post('/users', async (req, res) => {

    const client = await pool.connect();
    const { firebase_uid, email } = req.body;

    try {

        await client.query(`INSERT INTO users (firebase_uid, email)
  VALUES ($1, $2)
  RETURNING *;`, [firebase_uid, email]);

        res.status(200).json({ message: "User successfully registered" })

    } catch (err) {
        console.error("Error : ", err.message);
        res.status(500).json({ message: err.message });
    } finally {
        client.release();
    }
})

//ENDPOINT TO FETCH ALL CARS

app.get('/cars', async (req, res) => {

    const client = await pool.connect();

    try {

        const response = await client.query('SELECT * FROM cars');

        res.status(200).json(response.rows);

    } catch (err) {
        console.error("Error :", err.message);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
})

//ENDPOINT TO ADD CARS

app.post('/cars', async (req, res) => {

    const client = await pool.connect();
    const { brand, model, hourly_rate, imageurl } = req.body;

    try {

        const addCar = await client.query(`INSERT INTO cars (brand, model, hourly_rate, imageurl)
  VALUES ($1, $2, $3, $4)
  RETURNING *;`, [brand, model, hourly_rate, imageurl]);

        res.status(200).json(addCar.rows[0]);

    } catch (err) {
        console.error("Error :", err.message)
        res.status(500).json({ error: err.message })
    } finally {
        client.release();
    }
})

//ENDPOINT TO DELETE CARS

app.delete('/cars/:carId', async (req, res) => {
    const client = await pool.connect();
    const { carId } = req.params;

    try {

        await client.query(`
      DELETE FROM cars
      WHERE car_id = $1;`, [carId]);

        res.status(200).json({ message: "Selected car have been removed" })

    } catch (err) {
        console.error("Error : ", err.message);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
})

//ENDPOINT TO EDIT HOURLY_RATE BY CAR_ID

app.put('/cars', async (req, res) => {
    const client = await pool.connect();
    const { newHourRate, car_id } = req.body;

    try {

        const response = await client.query(`UPDATE cars SET hourly_rate = $1 WHERE car_id = $2 RETURNING *`, [newHourRate, car_id])

        res.status(200).json(response.rows)

    } catch (err) {
        console.error("Error : ", err.message);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
})

//ENDPOINT TO ADD BOOKING

app.post('/booking', async (req, res) => {

    const client = await pool.connect();
    const { user_id, car_id, start_date, start_time, end_date, end_time, total_price } = req.body;

    try {

        const booking = await client.query(`INSERT INTO Bookings (user_id, car_id, start_date, start_time, end_date, end_time, total_price)
        VALUES ($1, $2,$3, $4, $5, $6, $7)
        RETURNING *;`, [user_id, car_id, start_date, start_time, end_date, end_time, total_price])

        res.json(booking.rows[0])

    } catch (err) {
        console.error(err.message)
        res.status(500).json({ error: err.message })
    } finally {
        client.release()
    }
})

//ENDPOINT TO FETCH ALL BOOKINGS

app.get('/booking', async (req, res) => {
    const client = await pool.connect();

    try {

        const response = await client.query(`SELECT b.booking_id, u.firebase_uid, u.email, c.car_id, c.model, TO_CHAR(b.created_at::date, 'DD-MM-YYYY') AS created_date, b.total_price, TO_CHAR(b.start_date, 'DD-MM-YYYY') AS start_date, TO_CHAR(b.start_time, 'HH12:MI AM') AS start_time, TO_CHAR(b.end_date, 'DD-MM-YYYY') AS end_date, TO_CHAR(b.end_time, 'HH12:MI AM') AS end_time FROM bookings b JOIN users u ON b.user_id = u.firebase_uid JOIN cars c ON b.car_id = c.car_id;`)

        res.json(response.rows)

    } catch (err) {
        console.error("Error : ", err.message);
        res.status(500).json({ message: err.message });
    } finally {
        client.release();
    }
})

//ENDPOINT TO FETCH ALL BOOKING BY USER_ID

app.get('/booking/:userId', async (req, res) => {

    const client = await pool.connect();
    const { userId } = req.params;

    try {

        const response = await client.query(`
      SELECT 
        bookings.booking_id, 
        cars.model,
        TO_CHAR(bookings.start_date, 'DD-MM-YYYY') ||' at '|| TO_CHAR(bookings.start_time, 'HH12:MI AM') AS "start_schedule",
        TO_CHAR(bookings.end_date, 'DD-MM-YYYY') ||' at '|| TO_CHAR(bookings.end_time, 'HH12:MI AM') AS "end_schedule",
        bookings.total_price,
        TO_CHAR(bookings.created_at, 'DD-MM-YYYY') AS "created_at"
      FROM bookings
      JOIN cars ON bookings.car_id = cars.car_id 
      WHERE user_id = $1`, [userId]);

        res.json(response.rows);

    } catch (err) {
        console.error("Error :", err.message);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
})

//ENDPOINT TO DELETE A BOOKING BY BOOKING_ID

app.delete('/booking/:bookingId', async (req, res) => {
    const client = await pool.connect();
    const { bookingId } = req.params;

    try {

        await client.query(`
      DELETE FROM bookings
      WHERE booking_id = $1;`, [bookingId]);

        res.status(200).json({ message: "Bookings have been removed" })

    } catch (err) {
        console.error("Error : ", err.message);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
})

//ENDPOINT TO EDIT A BOOKING BY BOOKING_ID

app.put('/booking/:booking_id', async (req, res) => {
    const client = await pool.connect();
    const { booking_id } = req.params;
    const { start_date, start_time, end_date, end_time, total_price } = req.body;

    try {

        await client.query(`
      UPDATE bookings
        SET 
          start_date = $1,
          start_time = $2,
          end_date = $3,
          end_time = $4,
          total_price = $5
        WHERE 
          booking_id = $6;`, [start_date, start_time, end_date, end_time, total_price, booking_id]);

        const response = await client.query(`
      SELECT 
        bookings.booking_id, 
        cars.model,
        TO_CHAR(bookings.start_date, 'DD-MM-YYYY') ||' at '|| TO_CHAR(bookings.start_time, 'HH12:MI AM') AS "start_schedule",
        TO_CHAR(bookings.end_date, 'DD-MM-YYYY') ||' at '|| TO_CHAR(bookings.end_time, 'HH12:MI AM') AS "end_schedule",
        bookings.total_price,
        TO_CHAR(bookings.created_at, 'DD-MM-YYYY') AS "created_at"
      FROM bookings
      JOIN cars ON bookings.car_id = cars.car_id 
      WHERE booking_id = $1`, [booking_id]);

        res.status(200).json(response.rows)

    } catch (err) {
        console.error("Error : ", err.message);
        res.status(500).json({ message: err.message })
    }
})

///////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////


app.get("/", async (req, res) => {
    res.status(200).json({ message: "AUTOFLEX API is running" });
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})