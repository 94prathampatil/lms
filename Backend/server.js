import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import connectDB from './configs/mongodb.js'
import  {clerkWebhooks, stripeWebhooks } from './controllers/webhooks.controller.js'
import educatorRouter from './routes/educator.route.js'
import { clerkMiddleware } from '@clerk/express'
import connectCloudinary from './configs/cloudinary.config.js'
import courseRouter from './routes/course.route.js'
import userRouter from './routes/user.route.js'

// initialize express
const app = express()


// Connecting to Database
await connectDB()
await connectCloudinary()

// Middlewares
app.use(cors())
app.use(express.json())
app.use(clerkMiddleware())
app.use(express.urlencoded({ extended: true }));


// Routes
app.get('/', (req, res) => {
  res.send("You are requesting to Server")
})

app.post('/clerk', clerkWebhooks)
app.use('/api/educator', educatorRouter)
app.use('/api/course', courseRouter)
app.use('/api/user', userRouter)

// Seperate End point / API for payment
app.post('/stripe', express.raw({ type: 'application/json'}), stripeWebhooks)

// Port
const PORT = process.env.PORT || 5000

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`)
})
