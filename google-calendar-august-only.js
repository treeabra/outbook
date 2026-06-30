// AUGUST SHIFTS ONLY — adds to existing "Summer Shifts" calendar
// Wait 15 minutes after the first script, then paste this into script.google.com and Run.
// This adds a 1-second delay between events to avoid rate limiting.

function addAugustShifts() {
  // Find the existing "Summer Shifts" calendar
  var calendars = CalendarApp.getCalendarsByName('Summer Shifts');
  if (calendars.length === 0) {
    Logger.log('ERROR: Could not find calendar named "Summer Shifts". Create it first.');
    return;
  }
  var cal = calendars[0];
  Logger.log('Found calendar: Summer Shifts. Adding August events...');

  var colors = {
    'Lavender': '1',
    'Sage': '2',
    'Grape': '3',
    'Flamingo': '4',
    'Banana': '5',
    'Tangerine': '6',
    'Peacock': '7',
    'Graphite': '8',
    'Blueberry': '9',
    'Basil': '10',
    'Tomato': '11'
  };

  var shifts = [
    ['MINKA','2026-08-01','06:00','12:00','Lavender'],
    ['ABBY BISHOP','2026-08-01','08:00','13:00','Sage'],
    ['TED','2026-08-01','07:00','12:00','Grape'],
    ['ABBY K','2026-08-01','07:00','12:00','Tangerine'],
    ['GIANNA','2026-08-01','07:00','12:00','Banana'],
    ['GABE','2026-08-01','13:00','18:00','Basil'],
    ['MINKA','2026-08-02','06:00','12:00','Lavender'],
    ['THOMAS','2026-08-02','08:00','13:00','Peacock'],
    ['BO','2026-08-02','07:00','12:00','Peacock'],
    ['TED','2026-08-02','07:00','12:00','Grape'],
    ['ABBY K','2026-08-02','07:00','12:00','Tangerine'],
    ['GABE','2026-08-02','12:00','17:00','Basil'],
    ['CAM','2026-08-03','07:00','12:00','Tomato'],
    ['GIANNA','2026-08-03','08:00','13:00','Banana'],
    ['GABE','2026-08-03','07:00','12:00','Basil'],
    ['ABBY K','2026-08-03','13:00','18:00','Tangerine'],
    ['MINKA','2026-08-04','06:00','12:00','Lavender'],
    ['CAM','2026-08-04','08:00','13:00','Tomato'],
    ['THOMAS','2026-08-04','07:00','12:00','Peacock'],
    ['BO','2026-08-04','07:00','12:00','Peacock'],
    ['GABE','2026-08-04','07:00','12:00','Basil'],
    ['ABBY K','2026-08-04','13:00','18:00','Tangerine'],
    ['MINKA','2026-08-05','06:00','12:00','Lavender'],
    ['ABBY BISHOP','2026-08-05','08:00','13:00','Sage'],
    ['GABE','2026-08-05','07:00','12:00','Basil'],
    ['ABBY K','2026-08-05','07:00','12:00','Tangerine'],
    ['REAGAN','2026-08-05','07:00','12:00','Blueberry'],
    ['GIANNA','2026-08-05','13:00','18:00','Banana'],
    ['MINKA','2026-08-06','06:00','12:00','Lavender'],
    ['CAM','2026-08-06','07:00','12:00','Tomato'],
    ['ABBY BISHOP','2026-08-06','08:00','13:00','Sage'],
    ['THOMAS','2026-08-06','07:00','12:00','Peacock'],
    ['BO','2026-08-06','07:00','12:00','Peacock'],
    ['GABE','2026-08-06','13:00','18:00','Basil'],
    ['MINKA','2026-08-07','06:00','12:00','Lavender'],
    ['CAM','2026-08-07','07:00','12:00','Tomato'],
    ['ABBY BISHOP','2026-08-07','08:00','13:00','Sage'],
    ['GIANNA','2026-08-07','07:00','12:00','Banana'],
    ['ABBY K','2026-08-07','07:00','12:00','Tangerine'],
    ['GABE','2026-08-07','13:00','18:00','Basil'],
    ['MINKA','2026-08-08','06:00','12:00','Lavender'],
    ['ABBY BISHOP','2026-08-08','08:00','13:00','Sage'],
    ['GIANNA','2026-08-08','07:00','12:00','Banana'],
    ['REAGAN','2026-08-08','07:00','12:00','Blueberry'],
    ['GABE','2026-08-08','13:00','18:00','Basil'],
    ['MINKA','2026-08-09','06:00','12:00','Lavender'],
    ['ALESSANDRA','2026-08-09','06:00','12:00','Blueberry'],
    ['THOMAS','2026-08-09','08:00','13:00','Peacock'],
    ['BO','2026-08-09','07:00','12:00','Peacock'],
    ['GIANNA','2026-08-09','07:00','12:00','Banana'],
    ['GABE','2026-08-09','12:00','17:00','Basil'],
    ['CAM','2026-08-10','07:00','12:00','Tomato'],
    ['ALESSANDRA','2026-08-10','06:00','12:00','Blueberry'],
    ['GABE','2026-08-10','08:00','13:00','Basil'],
    ['GIANNA','2026-08-10','13:00','18:00','Banana'],
    ['MINKA','2026-08-11','06:00','12:00','Lavender'],
    ['CAM','2026-08-11','08:00','13:00','Tomato'],
    ['THOMAS','2026-08-11','07:00','12:00','Peacock'],
    ['BO','2026-08-11','07:00','12:00','Peacock'],
    ['STELLA','2026-08-11','07:00','12:00','Flamingo'],
    ['TED','2026-08-11','13:00','18:00','Grape'],
    ['MINKA','2026-08-12','06:00','12:00','Lavender'],
    ['ALESSANDRA','2026-08-12','06:00','12:00','Blueberry'],
    ['ABBY BISHOP','2026-08-12','08:00','13:00','Sage'],
    ['GABE','2026-08-12','07:00','12:00','Basil'],
    ['GIANNA','2026-08-12','07:00','12:00','Banana'],
    ['TED','2026-08-12','13:00','18:00','Grape'],
    ['MINKA','2026-08-13','06:00','12:00','Lavender'],
    ['CAM','2026-08-13','07:00','12:00','Tomato'],
    ['ALESSANDRA','2026-08-13','06:00','12:00','Blueberry'],
    ['ABBY BISHOP','2026-08-13','08:00','13:00','Sage'],
    ['THOMAS','2026-08-13','07:00','12:00','Peacock'],
    ['TED','2026-08-13','13:00','18:00','Grape'],
    ['MINKA','2026-08-14','06:00','12:00','Lavender'],
    ['CAM','2026-08-14','07:00','12:00','Tomato'],
    ['ALESSANDRA','2026-08-14','06:00','12:00','Blueberry'],
    ['ABBY BISHOP','2026-08-14','08:00','13:00','Sage'],
    ['TED','2026-08-14','07:00','12:00','Grape'],
    ['GIANNA','2026-08-14','13:00','18:00','Banana'],
    ['MINKA','2026-08-15','06:00','12:00','Lavender'],
    ['ALESSANDRA','2026-08-15','06:00','12:00','Blueberry'],
    ['ABBY BISHOP','2026-08-15','08:00','13:00','Sage'],
    ['TED','2026-08-15','07:00','12:00','Grape'],
    ['GIANNA','2026-08-15','13:00','18:00','Banana'],
    ['MINKA','2026-08-16','06:00','12:00','Lavender'],
    ['ALESSANDRA','2026-08-16','06:00','12:00','Blueberry'],
    ['BO','2026-08-16','08:00','13:00','Peacock'],
    ['THOMAS','2026-08-16','07:00','12:00','Peacock'],
    ['GIANNA','2026-08-16','07:00','12:00','Banana'],
    ['TED','2026-08-16','12:00','17:00','Grape'],
    ['CAM','2026-08-17','07:00','12:00','Tomato'],
    ['ALESSANDRA','2026-08-17','06:00','12:00','Blueberry'],
    ['TED','2026-08-17','08:00','13:00','Grape'],
    ['GIANNA','2026-08-17','13:00','18:00','Banana'],
    ['MINKA','2026-08-18','06:00','12:00','Lavender'],
    ['CAM','2026-08-18','08:00','13:00','Tomato'],
    ['BO','2026-08-18','07:00','12:00','Peacock'],
    ['THOMAS','2026-08-18','07:00','12:00','Peacock'],
    ['STELLA','2026-08-18','07:00','12:00','Flamingo'],
    ['TED','2026-08-18','13:00','18:00','Grape'],
    ['MINKA','2026-08-19','06:00','12:00','Lavender'],
    ['ALESSANDRA','2026-08-19','06:00','12:00','Blueberry'],
    ['STELLA','2026-08-19','08:00','13:00','Flamingo'],
    ['TED','2026-08-19','07:00','12:00','Grape'],
    ['GIANNA','2026-08-19','13:00','18:00','Banana'],
    ['MINKA','2026-08-20','06:00','12:00','Lavender'],
    ['CAM','2026-08-20','07:00','12:00','Tomato'],
    ['ALESSANDRA','2026-08-20','06:00','12:00','Blueberry'],
    ['BO','2026-08-20','08:00','13:00','Peacock'],
    ['THOMAS','2026-08-20','07:00','12:00','Peacock'],
    ['TED','2026-08-20','13:00','18:00','Grape'],
    ['MINKA','2026-08-21','06:00','12:00','Lavender'],
    ['CAM','2026-08-21','07:00','12:00','Tomato'],
    ['ALESSANDRA','2026-08-21','06:00','12:00','Blueberry'],
    ['STELLA','2026-08-21','08:00','13:00','Flamingo'],
    ['TED','2026-08-21','07:00','12:00','Grape'],
    ['GIANNA','2026-08-21','13:00','18:00','Banana'],
    ['MINKA','2026-08-22','06:00','12:00','Lavender'],
    ['GIANNA','2026-08-22','08:00','13:00','Banana'],
    ['TED','2026-08-22','13:00','18:00','Grape'],
    ['???','2026-08-22','07:00','12:00','Graphite'],
    ['MINKA','2026-08-23','06:00','12:00','Lavender'],
    ['BO','2026-08-23','08:00','13:00','Peacock'],
    ['THOMAS','2026-08-23','07:00','12:00','Peacock'],
    ['TED','2026-08-23','07:00','12:00','Grape'],
    ['GIANNA','2026-08-23','12:00','17:00','Banana'],
    ['CAM','2026-08-24','07:00','12:00','Tomato'],
    ['STELLA','2026-08-24','08:00','13:00','Flamingo'],
    ['GIANNA','2026-08-24','07:00','12:00','Banana'],
    ['TED','2026-08-24','13:00','18:00','Grape'],
    ['MINKA','2026-08-25','06:00','12:00','Lavender'],
    ['CAM','2026-08-25','08:00','13:00','Tomato'],
    ['BO','2026-08-25','07:00','12:00','Peacock'],
    ['THOMAS','2026-08-25','07:00','12:00','Peacock'],
    ['STELLA','2026-08-25','07:00','12:00','Flamingo'],
    ['TED','2026-08-25','13:00','18:00','Grape'],
    ['MINKA','2026-08-26','06:00','12:00','Lavender'],
    ['STELLA','2026-08-26','08:00','13:00','Flamingo'],
    ['TED','2026-08-26','07:00','12:00','Grape'],
    ['GIANNA','2026-08-26','13:00','18:00','Banana'],
    ['MINKA','2026-08-27','06:00','12:00','Lavender'],
    ['CAM','2026-08-27','07:00','12:00','Tomato'],
    ['BO','2026-08-27','08:00','13:00','Peacock'],
    ['THOMAS','2026-08-27','07:00','12:00','Peacock'],
    ['STELLA','2026-08-27','07:00','12:00','Flamingo'],
    ['TED','2026-08-27','13:00','18:00','Grape'],
  ];

  var count = 0;
  for (var i = 0; i < shifts.length; i++) {
    var s = shifts[i];
    var name = s[0];
    var date = s[1];
    var startTime = s[2];
    var endTime = s[3];
    var colorName = s[4];

    var startDate = new Date(date + 'T' + startTime + ':00-04:00');
    var endDate = new Date(date + 'T' + endTime + ':00-04:00');

    var event = cal.createEvent(name, startDate, endDate);

    var colorId = colors[colorName];
    if (colorId) {
      event.setColor(colorId);
    }

    count++;

    // Pause 1 second between events to avoid rate limiting
    Utilities.sleep(1000);
  }

  Logger.log('Done! Added ' + count + ' August shift events to "Summer Shifts".');
}
