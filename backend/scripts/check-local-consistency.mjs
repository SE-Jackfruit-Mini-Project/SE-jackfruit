import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';import assert from 'node:assert/strict';dotenv.config({ path: new URL('../.env', import.meta.url), quiet: true });import {prisma as p} from '../src/utils/prisma.js';import {bookAppointment} from '../src/services/appointment.service.js';import {recordCompletedDonation} from '../src/services/donation.service.js';
if(new URL(process.env.DATABASE_URL).hostname!=='localhost')throw Error('Local database required');
const tag='audit-'+Date.now();const ids=[],slotIds=[];const day=n=>new Date(Date.now()+n*86400000).toISOString().slice(0,10);const find=p.appointmentSlot.findUnique.bind(p.appointmentSlot);let result;
// Fixture-only local PostgreSQL test; every created row is removed in finally.
try{for(let i=0;i<3;i++)ids.push((await p.user.create({data:{fullName:'Disposable SE audit '+i,email:tag+'-'+i+'@example.test',passwordHash:await bcrypt.hash(randomBytes(32).toString('hex'),10),role:i===2?'STAFF':'DONOR',gender:'MALE',dateOfBirth:new Date('2000-01-01'),bloodGroup:'O_POSITIVE'}})).id);
const slot=await p.appointmentSlot.create({data:{date:day(10),startTime:'08:00',endTime:'09:00',maxCapacity:1}});slotIds.push(slot.id);
let reads=0,release;const barrier=new Promise(r=>release=r);p.appointmentSlot.findUnique=async args=>{const row=await find(args);if(args.where.id===slot.id){if(++reads===2)release();await barrier;}return row;};
const outcomes=await Promise.allSettled(ids.slice(0,2).map(id=>bookAppointment(id,{slotId:slot.id,weightKg:65})));p.appointmentSlot.findUnique=find;
const row=await find({where:{id:slot.id}});const booked=await p.appointment.count({where:{slotId:slot.id,status:'SCHEDULED'}});
const past=await p.appointmentSlot.create({data:{date:day(-2),startTime:'08:00',endTime:'09:00',maxCapacity:2,bookedCount:1}});slotIds.push(past.id);const appt=await p.appointment.create({data:{donorId:ids[0],slotId:past.id,weightKg:65}});
let mismatch;try{await recordCompletedDonation(ids[2],{donorId:ids[0],units:1,donationDate:day(-1),accepted:false,notes:'Disposable audit'});mismatch='ACCEPTED';}catch(e){mismatch={status:e.status,message:e.message};}
const intake = await Promise.allSettled([1,2].map(() => recordCompletedDonation(ids[2], { donorId: ids[0], units: 1, donationDate: day(-2), accepted: false, notes: 'Disposable concurrent audit' })));
const intakeCount = await p.donation.count({ where: { donorId: ids[0] } });
const pastStatus = (await p.appointment.findUnique({ where: { id: appt.id } })).status;
result={intake: { fulfilled: intake.filter(x => x.status === 'fulfilled').length, records: intakeCount, matchedStatus: pastStatus }, booking:{fulfilled:outcomes.filter(x=>x.status==='fulfilled').length,storedCount:row.bookedCount,actualBookings:booked,capacity:row.maxCapacity,rejections:outcomes.filter(x=>x.status==='rejected').map(x=>({status:x.reason.status,code:x.reason.code}))},mismatchedDonation:mismatch};
}finally{p.appointmentSlot.findUnique=find;await p.donation.deleteMany({where:{donorId:{in:ids}}});await p.appointment.deleteMany({where:{donorId:{in:ids}}});await p.appointmentSlot.deleteMany({where:{id:{in:slotIds}}});await p.user.deleteMany({where:{id:{in:ids}}});await p.$disconnect();}
assert.equal(result.booking.fulfilled, 1);
assert.equal(result.booking.storedCount, 1);assert.equal(result.booking.actualBookings, 1);
assert.equal(result.mismatchedDonation.status, 400);
assert.deepEqual(result.intake, { fulfilled: 1, records: 1, matchedStatus: 'COMPLETED' });
console.log(JSON.stringify({ result: 'PASS', ...result, fixturesRemoved: true }));