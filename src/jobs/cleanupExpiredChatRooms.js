import ChatRoom from '../models/ChatRoom.js';

const cleanupExpiredChatRooms = async () => {
  console.log('Running scheduled job: Deleting expired chat rooms...');

  try {
    const now = new Date();

    // Find all chat rooms where the expiration date is in the past
    const expiredRooms = await ChatRoom.find({
      expiresAt: { $ne: null, $lte: now },
    });

    if (expiredRooms.length === 0) {
      console.log('No expired chat rooms to delete.');
      return;
    }

    console.log(`Found ${expiredRooms.length} expired room(s).`);

    // Loop through and delete each room, which will trigger the pre-delete hook
    for (const room of expiredRooms) {
      await ChatRoom.findByIdAndDelete(room._id);
      console.log(`Deleted room ${room._id} and its associated messages.`);
    }

    console.log('Finished cleaning up expired chat rooms.');
  } catch (error) {
    console.error('Error during chat room cleanup job:', error);
  }
};

export default cleanupExpiredChatRooms;
