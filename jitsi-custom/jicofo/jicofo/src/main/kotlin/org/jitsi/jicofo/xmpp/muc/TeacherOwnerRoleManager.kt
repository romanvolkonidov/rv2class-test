/*
 * RV2Class - Custom Role Manager for Teacher Lobby Bypass
 *
 * This role manager automatically grants ownership (moderator) to teachers
 * while forcing students through the lobby.
 */
package org.jitsi.jicofo.xmpp.muc

import org.jitsi.utils.OrderedJsonObject
import org.jitsi.utils.logging2.createLogger

/**
 * A [ChatRoomRoleManager] which grants ownership to teachers (identified by email)
 * and forces all other users through the lobby.
 * 
 * Teachers are identified by:
 * 1. Email address matching the TEACHER_EMAILS list
 * 2. Presence extension containing userType=teacher
 */
class TeacherOwnerRoleManager(chatRoom: ChatRoom) : ChatRoomRoleManager(chatRoom) {
    private val logger = createLogger()
    
    // List of teacher email addresses
    private val TEACHER_EMAILS = setOf(
        "romanvolkonidov@gmail.com"
        // Add more teacher emails here
    )
    
    private var currentOwner: ChatRoomMember? = null

    override fun grantOwnership() = queue.add { checkAndGrantOwnership() }
    
    override fun memberJoined(member: ChatRoomMember) {
        logger.info("RV2CLASS: Member joined: ${member.name}, JID: ${member.jid}")
        
        // Check if this is a teacher and grant ownership immediately
        if (isTeacher(member)) {
            queue.add {
                logger.info("RV2CLASS: Teacher detected, granting ownership to ${member.name}")
                chatRoom.grantOwnership(member)
                currentOwner = member
            }
        } else if (currentOwner == null) {
            // No teacher yet, elect an owner from existing members
            checkAndGrantOwnership()
        }
    }

    override fun memberLeftOrKicked(member: ChatRoomMember) {
        if (member == currentOwner) {
            logger.info("RV2CLASS: Owner ${member.name} left, electing new owner")
            currentOwner = null
            checkAndGrantOwnership()
        }
    }

    override fun localRoleChanged(newRole: MemberRole) {
        if (!newRole.hasOwnerRights()) {
            logger.error("RV2CLASS: Local role has no owner rights, cannot manage roles.")
            return
        }
        checkAndGrantOwnership()
    }

    private fun checkAndGrantOwnership() {
        queue.add {
            if (currentOwner != null) {
                return@add
            }

            // First, check if there's already an owner
            currentOwner = chatRoom.members.find {
                !(it.isJibri || it.isJigasi) && it.role.hasOwnerRights()
            }
            if (currentOwner != null) {
                logger.info("RV2CLASS: Owner already exists: ${currentOwner?.name}")
                return@add
            }

            // Look for a teacher to grant ownership
            val teacher = chatRoom.members.find {
                !(it.isJibri || it.isJigasi) && it.role != MemberRole.VISITOR && isTeacher(it)
            }
            
            if (teacher != null) {
                logger.info("RV2CLASS: Granting ownership to teacher: ${teacher.name}")
                chatRoom.grantOwnership(teacher)
                currentOwner = teacher
                return@add
            }

            // Fallback: If no teacher found, grant to first regular participant
            // This handles the edge case where a student joins before a teacher
            val firstParticipant = chatRoom.members.find {
                !(it.isJibri || it.isJigasi) && it.role != MemberRole.VISITOR
            }
            
            if (firstParticipant != null) {
                logger.info("RV2CLASS: No teacher found, granting ownership to first participant: ${firstParticipant.name}")
                chatRoom.grantOwnership(firstParticipant)
                currentOwner = firstParticipant
            }
        }
    }

    /**
     * Check if a member is a teacher based on:
     * 1. Email address matching TEACHER_EMAILS list
     * 2. Presence extension (userType=teacher)
     */
    private fun isTeacher(member: ChatRoomMember): Boolean {
        // Check email
        val jid = member.jid?.toString() ?: member.occupantJid.toString()
        val email = extractEmail(jid)
        
        if (email != null && TEACHER_EMAILS.contains(email)) {
            logger.info("RV2CLASS: Identified teacher by email: $email")
            return true
        }

        // Check for userType=teacher in presence
        val presence = member.presence
        if (presence != null) {
            // Look for userInfo extension with userType=teacher
            val extensions = presence.extensions
            for (ext in extensions) {
                val xml = ext.toXML(null).toString()
                if (xml.contains("userType") && xml.contains("teacher")) {
                    logger.info("RV2CLASS: Identified teacher by userType presence extension")
                    return true
                }
            }
        }

        return false
    }

    /**
     * Extract email from JID string.
     * JID format can be: user@domain or user@domain/resource
     */
    private fun extractEmail(jid: String): String? {
        val cleanJid = jid.split("/")[0] // Remove resource if present
        return if (cleanJid.contains("@")) {
            cleanJid.lowercase()
        } else {
            null
        }
    }

    override val debugState
        get() = OrderedJsonObject().apply {
            put("class", this@TeacherOwnerRoleManager.javaClass.simpleName)
            put("currentOwner", currentOwner?.jid?.toString() ?: "null")
            put("teacherEmails", TEACHER_EMAILS.toString())
        }
}
