import { Webhook } from "svix";
import User from "../models/user.Schema.js"
import Stripe from "stripe";
import Purchase from "../models/purchase.Schema.js";
import Course from "../models/course.Schema.js";

// API Controller function to manage clerk User with database

export const clerkWebhooks = async (req, res) => {
    try {
        const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET)
        
        await whook.verify(JSON.stringify(req.body), {
            "svix-id": req.headers["svix-id"],
            "svix-timestamp": req.headers["svix-timestamp"],
            "svix-signature": req.headers["svix-signature"]
        })

        const { data, type } = req.body

        switch(type) {
            case 'user.created': {
                const userData = {
                    _id: data.id,
                    email: data.email_addresses[0].email_address,
                    name: data.first_name + " " + data.last_name,
                    imageUrl: data.image_url
                }
                await User.create(userData)
                res.json({})
                break;
            }
            
            case 'user.updated': {
                const userData = {
                    _id: data.id,
                    email: data.email_addresses[0].email_address,
                    name: data.first_name + " " + data.last_name,
                    imageUrl: data.image_url
                }
                await User.findByIdAndUpdate(data.id, userData)
                res.json({})
                break;
            }
            
            case 'user.deleted': {
                await User.findByIdAndDelete(data.id)
                res.json({})
                break;
            }
            
            default:
                break;
        }

    } catch (error) {
        res.json({success:false, message:error.message})
    }
}

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY)

export const stripeWebhooks = async (req, res) => {
    const sig = req.headers['stripe-signature'];

    let event;

    try {
        event = Stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        )
    } catch (error) {
        // Fixed: req.status to res.status
        return res.status(400).send(`Webhook Error: ${error.message}`)
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                const { purchaseId } = session.metadata;
                
                if (session.payment_status === 'paid') {
                    // Update purchase status to completed
                    const purchaseData = await Purchase.findById(purchaseId);
                    if (!purchaseData) {
                        console.log(`Purchase not found: ${purchaseId}`);
                        break;
                    }
                    
                    const userData = await User.findById(purchaseData.userId);
                    const courseData = await Course.findById(purchaseData.courseId.toString());
                    
                    // Update course with enrolled student
                    courseData.enrolledStudents.push(userData._id);
                    await courseData.save();
                    
                    // Update user with enrolled course
                    userData.enrolledCourses.push(courseData._id);
                    await userData.save();
                    
                    // Update purchase status
                    purchaseData.status = 'completed';
                    await purchaseData.save();
                    console.log(`Purchase completed: ${purchaseId}`);
                }
                break;
            }
            case 'checkout.session.async_payment_succeeded': {
                const session = event.data.object;
                const { purchaseId } = session.metadata;
                
                // Update purchase status to completed
                const purchaseData = await Purchase.findById(purchaseId);
                if (purchaseData) {
                    const userData = await User.findById(purchaseData.userId);
                    const courseData = await Course.findById(purchaseData.courseId.toString());
                    
                    courseData.enrolledStudents.push(userData._id);
                    await courseData.save();
                    
                    userData.enrolledCourses.push(courseData._id);
                    await userData.save();
                    
                    purchaseData.status = 'completed';
                    await purchaseData.save();
                    console.log(`Async payment succeeded for: ${purchaseId}`);
                }
                break;
            }
            case 'checkout.session.async_payment_failed': {
                const session = event.data.object;
                const { purchaseId } = session.metadata;
                
                const purchaseData = await Purchase.findById(purchaseId);
                if (purchaseData) {
                    purchaseData.status = 'failed';
                    await purchaseData.save();
                    console.log(`Async payment failed for: ${purchaseId}`);
                }
                break;
            }
            case 'payment_intent.payment_failed': {
                const paymentIntent = event.data.object;
                const paymentIntentId = paymentIntent.id;

                const session = await stripeInstance.checkout.sessions.list({
                    payment_intent: paymentIntentId
                });

                if (session.data.length > 0) {
                    const { purchaseId } = session.data[0].metadata;
                    const purchaseData = await Purchase.findById(purchaseId);
                    if (purchaseData) {
                        purchaseData.status = 'failed';
                        await purchaseData.save();
                    }
                }
                break;
            }
            default:
                console.log(`Unhandled event type ${event.type}`);
        }
        
        // Fixed: response to res
        return res.json({received: true});
    } catch (error) {
        console.error(`Error processing webhook: ${error.message}`);
        return res.status(500).json({ error: error.message });
    }
}
