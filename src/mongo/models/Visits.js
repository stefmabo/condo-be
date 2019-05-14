import mongoose from 'mongoose'
import { PENDING, STATUS } from '../../const'

const Schema = mongoose.Schema

const VisitSchema = new Schema({
  fullName: {
    type: String,
    required: true,
    tags: { type: [String], index: true },
    trim: true,
  },
  personId: {
    type: String,
    required: true,
    tags: { type: [String], index: true },
  },
  carPlate: {
    type: String,
    tags: { type: [String], index: true },
    trim: true,
  },
  entryDate: {
    type: String,
    required: true,
  },
  exitDate: {
    type: String,
  },
  houseToVisit: {
    type: String,
    required: true,
    tags: { type: [String], index: true },
    trim: true,
  },
  status: {
    type: String,
    enum: STATUS,
    default: PENDING,
  },
  details: {
    type: String,
  },
  goAlongWith: {
    type: Number,
  },
})

export default mongoose.model('Visit', VisitSchema)
