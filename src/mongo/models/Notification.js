import mongoose from 'mongoose'

const Schema = mongoose.Schema

const NotificationSchema = new Schema({
  notificationToken: {
    type: String,
    required: true,
    trim: true,
  },
})

export default mongoose.model('Notification', NotificationSchema)
