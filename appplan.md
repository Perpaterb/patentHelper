This app can be used by any non-group admin parent for free. Anyone wanting to administer a group which includes having access to a backup, images, videos and the logs of each group will need a subscription of $8 a month. This gets them 10GB of storage. Each 2GB of storage they need on top of that will be an extra $1 a month. 

In "my account"  there would need to be a storage tracker. to show and warn what it is costing them. It will be changed monthly.

Reactjs app in a wrapper to make it work all on platforms. Only android and and IOS for MVP1
Serviceless infrastructure.
Storage would be on AWS. 
Any server side function would be handled by lambda in production and a docker server in dev.
IAC is important and terraform would be used for as much as possible.
The app would prompt for a login and MFA using Kinde on login using an email address and email code MFA.

This app is a Parenting and Co-Parenting Helper App with 3 main functionalities
Messaging, calendar and financial. With and admin section and my account section also.

All Accounts can have different roles in different groups but only one role per group

No groups or messages can ever be deleted. They can only be hidden from non group admins. People can be allowed to "delete" their own messages but they are still visible to admins with hidden symbols on them and they are a little greyed out.

Every change message edits,,, everything that happens on a group is logged with a timestamp of the people that did it. groups admins can download this log at any point. The log, images and videos for each group are backed up in each admin's storage and can only be deleted by a user after they have left a group. Eash admin's storage is taken up by everything put into a group. 

App structure. 
Login screen
\/
Home page
├ App setting
├ My Account
└All groups list
   in each group
   ├ Group settings
   ├ Approvals list
   ├ Messages
   │    └All message groups list
   │       in each Message group 
   │        ├ Message group settings
   │        └ Messages
   ├ Calendar
   │    ├ Calendar settings
   │    └ Calendar
   └ Finance
        └All Finance matters list
           in each Finance matter
            └ Finance matter

All pages have the ability to go back / out a level with a button in the top left of the page and by swiping left.  

Main components pages to build
Login screen
Home page
Subscription page
App settings
My account
All groups list
Create group component
Groups list view group card
Member icons
Group settings
Group main page
Group main page big button
Approvals list
Approvals list card
All Messages groups list
Create Messages groups component
Messages groups list view Messages group card
Messages group settings
Messages page
Message components 
Message creation components
Calendar settings
Calendar
Child and responsibility line pop up component
Calendar Day View component
Calendar Week View component
Calendar Month view component
Even type selection component
Create event component
Create child responsibility event component
Responsibility selector slider component
All Finance matters list
Create Finance matters component
Finance matter list card
Finance matter
Finance matter description component
Finance matter description bar component
Report payment component

Group Roles types
Admin (A parent+ role, Can create groups, minimum 1 admin per group, requires subscription, Can access all logs and backups of group)
Parent 
Child
Caregiver
Supervisor (This is a family Supervisor not a child supervisor. A child supervisor is a caregiver if this option is selected when a person is being added to a group this warning should come up.) This user can only view but not interact in any other way.

Login Page
Using Kinde
Simple login with email MFA in MVP1

Home page
App setting
My Account
logout button
All groups list
Subscribe button (only if not subscribed)

Subscription page
Subscription payment will happen on the same day each month  

All groups list
List of all the groups as "Groups list view group card" that user is a member of. Admins can see all groups
Groups can be pinned to the top. otherwise are listed by latest activity.
Pinned groups are in order of pinning.
Admins have the ability to create a new group with a "Create" button on the top right

Create group component
This allows an admin to create a new groups. Only asks for a group name, icon and background image of colour. give the admin the ability to upload an image to use as the background. this backgroups is only used by the. "Groups list view group card"
All other administration is done from inside the group.

Groups list view group card
The "Groups list view group card" has the name of the group in the top left.
Top right has a cog for accessing the Group settings quickly
Top right pin button
Below the group name it has the icons of all the members. 

Member icons
A circle with the allocated colour and the icon letters (up to 3 letters). 
pressing on an icon will expand the icon circle into a pill shape (half circle either end and a rectangle between) to show the members name. And their role in the group.
The role they have in the group appears as a little coloured circle in the top left of the Member icons. Gold = admin,  Red = parent,  Yellow = Caregiver, Blue = child, Pink = Supervisor.

Group main page
Small buttons for Group settings
large buttons for
Approvals list
Messages groups
Calendar
Finance (only visible to roles that have access indicated by admins in groups settings
Group main page big button
A button with the text on it.
If more then one item in that buttons section needs to be actioned by the logged in user a red pill will appear with the number of actions that need to be actioned

Group settings (accessible from the cog inside the group of on the Groups list view group card)
All roles have mute or leave option. Admins can request to leave If they are the only admin this is a request to delete the group and can only be approved by the application support after viewing the logs to make sure nothing problematic is happening. If they are not the only admin approval from over 50% other admins is needed.
All roles have notification switches on/off
Request notification
All Message notification
Only @me Message notification
All Calendar notification
Only @me Calendar notification
All Finance matter notification
Only @me Finance matter notification

Role specific setting  
Admins
Add edit and remove members. allocate a colour, names and an icon letters to members.
It is recommended that all people that supervise a child are added as a member of the group. school, places and institutions do not need to be added. They do not need to be a user of the app. They can be added and removed at any point.
A person can have an email address allocated to them and they will send them an invite to the group or the app and the group if they have not registered with the app yet. 
Add and edit and remove all relationships.
Allocate role preferences for the group
Select denomination for finance
Select date format
Button to email group logs to self. The admin must specify a timeframe that the logs are created for. Media links are only available for 1 week from the log email being generated. 
Assign a new admin (note this needs to be a subscriber)
Settings Switches 
Parents can create message groups and send invites to members of the group
Children can create message groups and send invites to members of the group
Caregiver can create message groups and send invites to members of the group
Finance matters visible to parents
Finance matters can be created by parents (greyed out and off if "Finance matters visible to parents" option is off)
Finance matters visible to caregivers
Finance matters can be created by caregivers (greyed out and off if "Finance matters visible to caregivers" option is off)
Finance matters visible to children
Finance matters can be created by children (greyed out and off if "Finance matters visible to children" option is off)
I allow this group admin to: (See all other admins under each one all the switches to auto approve administrative changes they make. )
hide any message without my approval. (admins can still see)
add people without my approval.
remove people without my approval.
assign a role to a new user without my approval.
change a role to a non admin user without my approval.
assign a relationship to a user without my approval.
change a relationship to a non admin user without my approval.
make calendar entries without my approval.
assign children to calendar entries without my approval.
assign a caregiver or including myself to calendar entries without my approval.
More than 50% of the Admins must approve the removal of another admin. all admins must approve the addition of another admin. More than 50% of the Admins must approve a group to be hidden.

Unsubscribe option: This will send and email to them with a link to confirm that they don't want to be subscribed anymore. Telling them that there access will be removed at the end of their current payment period.

Parent
Can see which group members are linked to them in relationships.
Can request for admin to add another member.
If allowed by admin an option create new message group
If allowed by admin a list of message group they created with a send invite button that opens a list of group members. on selection if that member is not a member of that message group already they will get an approval request to be added.

Child
If allowed by admin an option create new message group
If allowed by admin a list of message group they created with a send invite button that opens a list of group members. on selection if that member is not a member of that message group already they will get an approval request to be added.

Caregiver
If allowed by admin an option create new message group
If allowed by admin a list of message group they created with a send invite button that opens a list of group members. on selection if that member is not a member of that message group already they will get an approval request to be added.

Supervisor
Nothing special

Logs
Admins of a group can request the logs to be emailed to them. The logs email will generate a password that can be used to access each media link in that log.
Logs are a CSV file with everything single things that has happened in the group by everyone and how did it and when they did it.
CSV Logs column date, time, action, action location, users name, users email (if applicable), message content (if applicable), link to media (if applicable) 

for example if a user send a message to a message group
Logs would show the date, time, action might be "sent message", action location "message group {name of the message group}. "message content" {the message sent as a string including emojis in string form}, "link to media" If the message had images or videos then a link to each is generated.
Media log links are generated when logs email is created. Images and videos can have many links connected to them. 

Approvals list
Just shows a list of approvals that have been requested by this user or of this user for that group
3 lists of "Approvals list card" arranged by date
Approvals awaiting your action (Have reject or approve buttons) (Finance matters have a button that takes them to the Finance matters they can't be settled from the "Approvals list")
Approvals you have made awaiting the action of others ( Have cancel button)
All canceled, reject or approved Approvals (can't be edited)
Approvals list card
Card that shows the info about the approval and has the action buttons along the bottom.

All Messages groups list
A list of all the Messages group as "Messages groups list view Messages group cards" that user is a member of. Admins can see all Messages groups even if they are not members and can't send messages
Messages groups can be pinned to the top. otherwise are listed by latest activity.
Pinned groups are in order of pinning.
If people have a role with the ability to create a Message group they see a "Create" button on the top right

Create Messages groups component

Messages groups list view Messages group card
The "Messages groups list view Messages group card" has the name of the messages group in the top left,
Top right has a cog for accessing the Messages group settings
Top right pin button
Top right Red pill with the number of unread messages If any
Top right yellow pill with the number of @ you messages if any 
Below the messages group name it has the icons of all the members

Messages group settings (accessible from the cog inside  each messages group view)
Admins
Parent
Child
Caregiver
Supervisor

Messages page
This just looks like a whatsapp message page
At the bottom there is a + on the left to send images and videos from the photos and video on the phone. This button disappears is there is any text in the "Message creation components" and the "Message creation components" fills the bottom of the page.
The rest of the bottom is taken up by the "Message creation components"You can @ other messages group members so they will see that they have an @ message from the "Messages groups list view Messages group card"

Message components
Word wrap is enables
Messages you send have a yellow background
Messages from other people send have a grey background
Messages you have been @ed  in have a 1px blue boarded until you have see the message.
Messages sent statuses (only on message you send)
seen by all 2 blue diamonds
seen by some 1 blue diamond 1 grey diamond
seen by none but delivered to server 2 grey diamonds
sent by you but not confirmed received by server yet 1 grey diamond
Message creation components
Just a standard text field that starts as one line and expanded to 10 lines and then becomes a scrollable text field.
Word wrap is enables.
Note "supervises" don't see this and can't message. all other roles can 

Calendar settings (accessible from the cog inside each main calendar view) 
Admins
Parent
Child
Caregiver
Supervisor

Calendar
Regular looking calendar like google calendar iphone app. (default week view of current)
The month name and last 2 digits of the year is always shown at the top. and can be clicked on to change the month and year.
Selector in the top left for month, week or day view."
Swiping left or right will increase or decrees months of the month view, weeks in the week view or days on the day view. This needs to be 40% of the screen swipe and will have a springy animation.
All swipes up,down,left or right only happen 1 at a time with the direction the swipe started being the swipe action taking place. e.g if i was to start swiping down and them move my finger left without taking it off the screen the only swiping action/movement  that would take place is the up and down movement.
"+" button in the top right takes you to the Even type selection component
Editing a saved event will need other admin approval.
Each day in all the calendar view components has the events on the right as boxes corresponding to the times the event is on. it cannot be less than 1 pixel high.
Each day in all the calendar view components has coloured lines on the left showing the children and the member or other responsible for them at that time.
Each line is the members icon colour.
The lines will always take up the left half of the day. with no gap between a child and responsibility line. But there is a small gap between each child and responsibility parring. This means the lines will get thinner and wider depending on how many different children and people or "other" are responsible for them.
Each day shows the full day from 12am at the top to 11:59pm at the bottom line form. It is the timeline that the coloured lines are along. 
The current day is highlighted in every view. 

ExampleA: Child (red) is with Mum (blue) the entire week. The only "child responsibility event" starts at Tuesday 12pm (noon) when Dad (green) starts to be responsible for them. This event ends on Wednesday at 4pm when Mum takes back responsibility. When looking both Tuesday and Wednesday in any view the fist 1/4 from left to right is a Red line representing the child. On the Tuesday half way down the day the second line changes from blue to green as the responsibility changed from Mum to Dad at noon. On the Wednesday the second line changes from green back to blue about 16/24ths down the day. as the responsibility changed from Dad to Mum at 4pm.

ExampleB: Child1 (red), Child2 (yellow) start the day with Dad (green). They both go to school (purple) at 8am. At 2pm Child1 is picked up by mum (blue) for a doctor's appointment. at 3pm Child2 goes to after school care (pink). at 4pm Child2 is picked up by mum and both children spend the night with mum. Because there are 2 children the first line is red (Child1) and the 3rd is yellow (Child2) the entire day. The 2nd line is the person or "other" responsible for child1 and the 4th line is the person or "other" responsible for child2. So the 2nd line is green till 8/24ths down the day where it changes to purple. 14/24ths down it changes to Blue for the rest of the day. The 4th line is green till 8/24ths down the day where it changes to purple. 15/24ths down it changes to pink. 16/24ths down it changes to Blue for the rest of the day.

Child and responsibility line pop up component
Taping on a line will bring up a pop up rectangle the colour of the line with start time at the top, the end time a the bottom and the name of the child or responsibility as well as the member icon in the middle.
An edit button on the top right will take you the corresponding "Create child responsibility event component" in edit mode.
tapping again on the pop up would make it disappear.

Calendar Day View component
One day is shown with the date in the top left and M,TU,W,TH,F,SA,SU above the dates.
24hrs is a scrollable / up and down swipe-able section that is about 250% the height of the component space. Each hour is on the left most side, 1am, 2am, 3 am and so on till 11pm. 12am is not shown at eather the top or the bottom. The main calendar space that has the child and responsibility lines takes and events takes up all the space the hour text dosn't and has a background of horizontal lines for each hour, the hours text taking up the left 20%. 
Long pressing on an hr in this view with first highlight that hr and then open "Even type selection component" to create an even or child responsibility event and pass thin info to prefill the start time and end time 1hr after the start time.

Calendar Week View component
Day and week view look alike with the up and down scrollable day with the hours on the left. The weak view makes the hours text only take up 10% of the left side of the component. and there are now vertical lines in the background between each day. 
One week is shown with the dates along the top and M,TU,W,TH,F,SA,SU above the dates.
Long pressing on an hr in this view with first highlight that hr and then open "Even type selection component" to create an even or child responsibility event and pass thin info to prefill the start time and end time 1hr after the start time.

Calendar Month view component
Long pressing on an day in this view with first highlight that hr and then open "Even type selection component" to create an event or child responsibility event and pass thin info to prefill the start time as the current time to the last hour and end time 1hr after the start time.
Short pressing on a day in the month view will take you to the "Calendar Day View component"
M,TU,W,TH,F,SA,SU across the top. 
Then a grid taking up the maximum amount of space full width. The grid is 7 left to right (columns) for each day of the week and 6 down (rows) making more than enough days for each month. The 1st of the month is always on the first row on the right day of the week.
Unlike the week and day view the Child and responsibility lines are at the top running left to right of each day and are unbroken between days. but they work in the same way. showing a timeline for each child and responsibility line pairing.
The events in the month view take up the bottom half of each day. 

Even type selection component
2 buttons: Create event (go to "Create event component") or Create child responsibility event (go to "Create child responsibility event component")

Create event component
This is for normal event and do not involve a child or children
Even title
Start time and date (nice in for selecting this) if a day or time is selected it is prefilled
End time and date (nice in for selecting this) default to 1 hr after start time date
Member attending. Scrollable list with all group members
Repeating even options. repeat every x number of day, week, month, year. until date time. Note editing an event that is part of a repeating event will ask if they want to update all events going forward from this event.
Note field for all other info. 

Create child responsibility event component
Even title
Select the children that this responsibility even applies to. scrollable list with all children in group, checkboxes for selecting multiple.
Start time and date (nice in for selecting this) if a day or time is selected it is prefilled
End time and date (nice in for selecting this) default to 1 hr after start time date
"Responsability selector slider component" start of event
"Responsability selector slider component" end of event
The option that change based on what is selected on the "Responsability selector slider component" 
Repeating even options. repeat every x number of day, week, month, year. until date time. Note editing an event that is part of a repeating event will ask if they want to update all events going forward from this event.
Note field for all other info. 
Buttons at the bottom. Save (if new), Request update (is changes made in edit mode), Request delete (if in edit mode)

Responsibility selector slider component
A slider with 4 othions
No change: (With the member icon above) Note: this will look at the start time and who is responsible for the child/ children on the calendar already.
Change to what is on the calendar already: (With the member icon above) Note: this will look at the end time and who is responsible for the child/ children on the calendar already.
Change of responsibility to members: Select responsible people. scrollable list with all Parents and Caregivers.
Change of responsibility to "other": first a list with a "new" button at the top and then all the past created others. if new there will be 3 options just like the "Member icons" full name, icon letters and colour selector

All Finance matters list
2 lists of "Finance matter list card"
Unsettled Finance matter
Settled Finance matters 
If people have a role with the ability to create a Finance matters they see a "Create" button on the top right
Settled matters can be changed to unsettled by the creator or and admin.

Create Finance matters component
This component will also be used when editing a Finance matter.
After submitting editing a Finance matter will need more than 50% of admins approval.
Ability to add and remove people involved in the Finance matter
Enter and Edit the total amount and what percentage or amount in the denomination each person should pay. up to 100% total. 
Edit the amount each person has paid in the denomination.
submit button. notification sent to all people involved

Finance matter list card
The "Finance matter list card" has the name of the finance matter group in the top left.
Top right pin button
Below the group name it has the icons of all the members of that Finance matter. 

Finance matter
It's just like a message thread but with 
Top right is setting of the Finance matter. setting only shows to the creator of the Finance matter and admins. Changes to any Finance matter need to be approved by more the %50 of admins. And is done on a pre filled Create Finance matters component. 
has a "Finance matter description component" that show up when the "info" button is clicked
User don't have the ability to leave
Top lets is a "Report payment" button. This will bring up the "Report payment component". When a Payment has been reported an approval is sent to the listed "member payed to" to confirm that it has been received.
Top of the page is also a "Mark as settled" Button. (If this is done by the creator of the finance matter it is marked as settled straight away. otherwise an approval notification in sent to the creator of the finance matter)
All actions like unsettled ,settled, a report of payment are logged as messages by the person that did the action 
Example a "report of payment" message will say @"members name" has reported making a payment of {amount with denomination} to @"member payed to" and then the receipt image is posted for anyone to view. and a time stamp
Example on approval of payment received a message will say @"member payed to" has confirmed resiving the payment of {amount with denomination} from @"members name".  and a time stamp. This will also update the Finance matters info. taking the amount away from the amount the members that received the payment needs to pay and adding it to the member that sent the money.

Example of Finance matter:  Member A makes a payment for kids shoes. They make a Finance matter adding Member B asking them to pay for half. The expected bars show %50 for both members. The currently paid show Member A %100 and Member B %0. Member B transfers %50 to Member A and makes a "report of payment" attracting the recipe image. Member A confirms the payment when they see the money in their back account. The currently paid info updates to %50 to both members. The Finance matter can be closed without problems.

Finance matter description component
"close" button top right
The name at the top
A description
The total amount need or spent
As many "Finance matter description bar component" showing the amount expected to be paid by each member.
The due date (optional)
As many "Finance matter description bar component" showing the the amount currently paid by each member.

Finance matter description bar component
This bar fills horizontally
Has a members Icon
Has a amount with the groups denomination
The bar is filed with the members icon colour to the percentage (up to 100%) that is passed to if from it's parent. (If it's an "expected" bar it will be %100. If it is the "currently paid" bar it will be the % of the expected amount that is confirmed to be paid. If someone has already paid )

Report payment component
This is just a form asking for the amount paid and an image of the receipt of payment and the member payed to. 


User Cases

UC1:
I use a group for family management and communication for everything to do with my first wife and our 2 kids.
membership is me and my ex-wife as the parents both admins. our children, Their grandparents, aunts and uncles as caregivers.


UC2:
Parents have locked down the phones of their children so that the children can only use this app to massage people.
Children without a restricted phone still need to use this app to massage the children that are restricted to this app.
Admins can monitor the children's conversations if needed.
The level of privacy of the children can be discussed and managed by the parents.
Message groups can be setup for all the individual connections between children or children can have access to create new message groups including anyone in the group.  