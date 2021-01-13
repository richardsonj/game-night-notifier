const Discord = require("discord.js");
const express = require("express");
const app = express();
const moment = require("moment-timezone");
moment.tz.setDefault("America/Chicago");
const http = require("http");
require("dotenv").config();
const fs = require('fs');
const { relativeTimeRounding } = require("moment-timezone");

const client = new Discord.Client();
client.login(process.env.TOKEN).catch(error => console.log(error));

client.on("ready", startReminderLoop);

let reminders = [];

function startReminderLoop() {
  console.log("Checking for upcoming reminders");
  loadSavedReminders();
  setInterval(loadSavedReminders, process.env.INTERVAL * 60000);
}

function loadSavedReminders() {
  reminders = JSON.parse(fs.readFileSync("reminders.json", 'utf8'));
  for (reminder of reminders) {
    readyReminder(reminder);
  }
}

function readyReminder(reminder) {
  if (reminder.nextReminderDate == null)
  {
    return;
  }
  let nextReminderDate = moment(reminder.nextReminderDate);
  let now = moment();
  let schedulingIntervalEnd = moment(now);
  schedulingIntervalEnd.add(process.env.INTERVAL, 'minutes');
  if (nextReminderDate.isBefore(schedulingIntervalEnd)) {
    if (nextReminderDate.isSameOrBefore(now)) {
      postReminder(reminder);
    }
    else {
      console.log("Setting reminder for " + nextReminderDate.toISOString());
      setTimeout(() => postReminder(reminder), nextReminderDate.valueOf() - now.valueOf());
    }
  }
}

function postReminder(reminder) {
  let channel = client.channels.cache.get(reminder.channel);

  console.log("Posting reminder to " + channel.name);
  channel.send(
    reminder.message.replace("{channel}", channel.toString())
  );
  advance(reminder);
  readyReminder(reminder);
  updateReminders()
}

function updateReminders() {
  reminders = reminders.filter(reminder => reminder.nextReminderDate != null);
  fs.writeFileSync("reminders.json", JSON.stringify(reminders));
}

function advance(reminder) {
  if (reminder.frequency === "WEEKLY") {
    reminder.nextReminderDate = moment(reminder.nextReminderDate).add(1, "w").toISOString();
  }
}