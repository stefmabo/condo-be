import { PubSub } from 'apollo-server'
import axios from 'axios'

import Visit from '../mongo/models/Visits'
import Notification from '../mongo/models/Notification'

import { isSameDay } from '../utils'
import { AUTHORIZED, DELETED } from '../const'

const VISIT_ADDED = 'VISIT_ADDED'
const VISIT_EDITED = 'VISIT_EDITED'
const VISIT_DELETED = 'VISIT_DELETED'
const VISIT_AUTHORIZED = 'VISIT_AUTHORIZED'

const pubsub = new PubSub()

function notificationToken(root, args) {
  return new Promise((resolve, reject) => {
    Notification.findOne({}).exec((err, res) => {
      err
        ? reject(err)
        : resolve((res && res.notificationToken) || 'No se ha suscrito')
    })
  })
}

function regex(attr, $regex, $options = 'i') {
  return $regex ? { [attr]: { $regex, $options } } : {}
}

function getDate(entryDate) {
  return entryDate ? new Date(entryDate) : new Date()
}

function getPubSubState(isVisitSameDay, isFutureVisitSameDay, visit) {
  const isDeleted = isVisitSameDay && !isFutureVisitSameDay
  const isEdited = isVisitSameDay && isFutureVisitSameDay
  const isAdded = !isVisitSameDay && isFutureVisitSameDay

  if (isDeleted) return [VISIT_DELETED, { visitDeleted: visit }]
  if (isEdited) return [VISIT_EDITED, { visitEdited: visit }]
  if (isAdded) return [VISIT_ADDED, { visitAdded: visit }]

  return []
}

export default {
  Query: {
    visit: (root, { id }) => {
      if (!id.match(/^[0-9a-fA-F]{24}$/)) return null

      return Visit.findOne({ _id: id })
    },
    visits: (root, { entryDate, status, search }) => {
      const start = getDate(entryDate)
      start.setHours(0, 0, 0, 0)

      const end = getDate(entryDate)
      end.setHours(23, 59, 59, 999)

      const statusField = status ? { status } : { status: { $ne: DELETED } }

      const find = Visit.find({
        $and: [
          {
            $or: [
              regex('fullName', search),
              regex('houseToVisit', search),
              regex('personId', search),
              regex('carPlate', search),
            ],
          },
          {
            entryDate: {
              $gte: start,
              $lt: end,
            },
            ...statusField,
          },
        ],
      })

      return find.populate().sort(status ? { $natural: -1 } : { status: -1 })
    },
    notificationToken,
  },
  Mutation: {
    addVisit: (root, { id, entryDate, ...data }) => {
      if (id) {

        return new Promise((resolve, reject) => {
          Visit.findById(id).exec(function(err, visit) {
            if (err) reject(err)

            const isVisitSameDay = isSameDay(visit.entryDate)
            const isFutureVisitSameDay = isSameDay(entryDate)

            Object.keys(data).forEach(attr => {
              visit[attr] = data[attr]
            })

            visit.entryDate = new Date(getDate(entryDate).setHours(1, 0, 0, 0))

            visit.save(err => {
              if (err) reject(err)

              pubsub.publish(
                ...getPubSubState(isVisitSameDay, isFutureVisitSameDay, visit),
              )

              resolve(visit)
            })
          })
        })
      }

      const newVisit = new Visit({
        entryDate: new Date(getDate(entryDate).setHours(1, 0, 0, 0)),
        ...data,
      })
      return new Promise((resolve, reject) => {
        newVisit.save((err, res) => {
          if (err) return reject(err)

          if (isSameDay(entryDate)) {
            pubsub.publish(VISIT_ADDED, { visitAdded: res })
          }

          resolve(res)
        })
      })
    },
    deleteVisit: (root, { id }) => {
      return new Promise((resolve, reject) => {
        Visit.findByIdAndUpdate(id, { status: DELETED }, { new: true }).exec(
          (err, res) => {
            if (err) return reject(err)
            pubsub.publish(VISIT_EDITED, {
              visitEdited: res,
            })

            resolve(res)
          },
        )
      })
    },
    authorizeVisit: (root, { id }) => {
      return new Promise((resolve, reject) => {
        Visit.findByIdAndUpdate(id, { status: AUTHORIZED }, { new: true }).exec(
          async (err, res) => {
            if (err) return reject(err)
            pubsub.publish(VISIT_AUTHORIZED, {
              visitAuthorized: res,
            })

            pubsub.publish(VISIT_EDITED, {
              visitEdited: res,
            })

            const to = await notificationToken()

            axios.post(
              'https://fcm.googleapis.com/fcm/send',
              {
                notification: {
                  title: 'Autorización',
                  body: `${res.fullName} llegó al condominio`,
                  click_action: 'http://localhost:3003/',
                  icon: 'http://url-to-an-icon/icon.png',
                },
                to,
              },
              {
                headers: {
                  Accept: 'application/json',
                  'Content-Type': 'application/json',
                  Authorization:
                    'key=AAAAI34CQP4:APA91bE526pKUaP9jeI34QTWsFF_oHsfbEGZADpBZ85TNZy20xl6HqW3QgeEoRk45C4RYSOA-YIYWnz8hqd-O24aaWMR-qYbLxcq_GXVGLZqVnIGi-BMHB1xMpJz8LEaBEnb3v0X_dWD',
                },
              },
            )

            resolve(res)
          },
        )
      })
    },
    addNotificationToken: (root, { notificationToken }) => {
      return new Promise(async (resolve, reject) => {
        await Notification.remove()
        Notification.findOneAndUpdate(
          { notificationToken },
          { $set: { notificationToken } },
          { upsert: true },
        ).exec((err, res) => {
          if (err) return reject(err)
          resolve(true)
        })
      })
    },
  },
  Subscription: {
    visitAdded: {
      subscribe: () => pubsub.asyncIterator([VISIT_ADDED]),
    },
    visitEdited: {
      subscribe: () => pubsub.asyncIterator([VISIT_EDITED]),
    },
    visitDeleted: {
      subscribe: () => pubsub.asyncIterator([VISIT_DELETED]),
    },
    visitAuthorized: {
      subscribe: () => pubsub.asyncIterator([VISIT_AUTHORIZED]),
    },
  },
}
