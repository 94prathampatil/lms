import mongoose from 'mongoose'

//  Connect to the mongodb database

const connectDB = async () => {
    mongoose.connection.on('connected', () => {
        console.log("✅MongoDb Database is Connected")
    })

    await mongoose.connect(`${process.env.MONGODB_URI}/EduHut`)
}

export default connectDB