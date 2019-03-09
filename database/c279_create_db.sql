-- Generated using MySQL Workbench with some manual tweaks

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Schema c279
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `c279` DEFAULT CHARACTER SET utf8 ;
USE `c279` ;

-- -----------------------------------------------------
-- Table `c279`.`Users`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `c279`.`Users` (
  `UserId` INT NOT NULL AUTO_INCREMENT,
  `Username` VARCHAR(45) NOT NULL,
  `RealName` VARCHAR(45) NULL,
  PRIMARY KEY (`UserId`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `c279`.`UserCredentials`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `c279`.`UserCredentials` (
  `Users_UserId` INT NOT NULL,
  `HashedPassword` VARCHAR(88) NOT NULL,
  `PersistentPubKey` VARCHAR(88) NOT NULL,
  `EncryptedPersistentPrivKey` VARCHAR(88) NOT NULL,
  INDEX `fk_UserCredentials_Users_idx` (`Users_UserId` ASC),
  PRIMARY KEY (`Users_UserId`),
  CONSTRAINT `fk_UserCredentials_Users`
    FOREIGN KEY (`Users_UserId`)
    REFERENCES `c279`.`Users` (`UserId`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `c279`.`Contacts`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `c279`.`Contacts` (
  `ContactsId` INT NOT NULL AUTO_INCREMENT,
  `Owning_UserId` INT NOT NULL,
  `Target_UserId` INT NOT NULL,
  `DateAdded` DATETIME NOT NULL,
  `ContactType` VARCHAR(10) NOT NULL,
  PRIMARY KEY (`ContactsId`),
  INDEX `fk_Contacts_Users2_idx` (`Owning_UserId` ASC),
  INDEX `fk_Contacts_Users1_idx` (`Target_UserId` ASC),
  CONSTRAINT `fk_Contacts_Users2`
    FOREIGN KEY (`Owning_UserId`)
    REFERENCES `c279`.`Users` (`UserId`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_Contacts_Users1`
    FOREIGN KEY (`Target_UserId`)
    REFERENCES `c279`.`Users` (`UserId`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `c279`.`Sessions`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `c279`.`Sessions` (
  `SessionId` INT NOT NULL,
  `SessionType` VARCHAR(10) NOT NULL,
  `SessionStartDate` DATETIME NOT NULL,
  PRIMARY KEY (`SessionId`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `c279`.`UserToSession`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `c279`.`UserToSession` (
  `Sessions_SessionId` INT NOT NULL,
  `Users_UserId` INT NOT NULL,
  PRIMARY KEY (`Sessions_SessionId`, `Users_UserId`),
  INDEX `fk_Sessions_has_Users_Users1_idx` (`Users_UserId` ASC),
  INDEX `fk_Sessions_has_Users_Sessions1_idx` (`Sessions_SessionId` ASC),
  CONSTRAINT `fk_Sessions_has_Users_Sessions1`
    FOREIGN KEY (`Sessions_SessionId`)
    REFERENCES `c279`.`Sessions` (`SessionId`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_Sessions_has_Users_Users1`
    FOREIGN KEY (`Users_UserId`)
    REFERENCES `c279`.`Users` (`UserId`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `c279`.`Messages`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `c279`.`Messages` (
  `MessageId` INT NOT NULL AUTO_INCREMENT,
  `Sessions_SessionId` INT NOT NULL,
  `EncryptedMessageContent` TEXT NOT NULL,
  `Sender_UserId` INT NOT NULL,
  PRIMARY KEY (`MessageId`),
  INDEX `fk_Messages_Sessions1_idx` (`Sessions_SessionId` ASC),
  INDEX `fk_Messages_Users1_idx` (`Sender_UserId` ASC),
  CONSTRAINT `fk_Messages_Sessions1`
    FOREIGN KEY (`Sessions_SessionId`)
    REFERENCES `c279`.`Sessions` (`SessionId`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_Messages_Users1`
    FOREIGN KEY (`Sender_UserId`)
    REFERENCES `c279`.`Users` (`UserId`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `c279`.`Files`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `c279`.`Files` (
  `fileId` INT NOT NULL AUTO_INCREMENT,
  `fileName` VARCHAR(100) NOT NULL,
  `encryptedFileData` TEXT NOT NULL,
  `encryptedEncryptionHeader` VARCHAR(64) NOT NULL,
  `FileOwner_UserId` INT NOT NULL,
  PRIMARY KEY (`fileId`),
  INDEX `fk_Files_Users1_idx` (`FileOwner_UserId` ASC),
  CONSTRAINT `fk_Files_Users1`
    FOREIGN KEY (`FileOwner_UserId`)
    REFERENCES `c279`.`Users` (`UserId`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `c279`.`FileEncryptionHeaderStore`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `c279`.`FileEncryptionHeaderStore` (
  `headerId` INT NOT NULL AUTO_INCREMENT,
  `Files_fileId` INT NOT NULL,
  `Sharer_UserId` INT NOT NULL,
  `Sharee_UserId` INT NOT NULL,
  `encryptedEncryptionHeader` VARCHAR(88) NOT NULL,
  PRIMARY KEY (`headerId`),
  INDEX `fk_FileEncryptionHeaderStore_Files1_idx` (`Files_fileId` ASC),
  INDEX `fk_FileEncryptionHeaderStore_Users1_idx` (`Sharer_UserId` ASC),
  INDEX `fk_FileEncryptionHeaderStore_Users2_idx` (`Sharee_UserId` ASC),
  CONSTRAINT `fk_FileEncryptionHeaderStore_Files1`
    FOREIGN KEY (`Files_fileId`)
    REFERENCES `c279`.`Files` (`fileId`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_FileEncryptionHeaderStore_Users1`
    FOREIGN KEY (`Sharer_UserId`)
    REFERENCES `c279`.`Users` (`UserId`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_FileEncryptionHeaderStore_Users2`
    FOREIGN KEY (`Sharee_UserId`)
    REFERENCES `c279`.`Users` (`UserId`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `c279`.`GroupSessionSymmetricKey`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `c279`.`GroupSessionSymmetricKey` (
  `SessionSymmetricKeyId` INT NOT NULL AUTO_INCREMENT,
  `Owner_UserId` INT NOT NULL,
  `Sessions_SessionId` INT NOT NULL,
  INDEX `fk_GroupSessionSymmetricKey_Sessions1_idx` (`Sessions_SessionId` ASC),
  INDEX `fk_GroupSessionSymmetricKey_Users1_idx` (`Owner_UserId` ASC),
  PRIMARY KEY (`SessionSymmetricKeyId`),
  CONSTRAINT `fk_GroupSessionSymmetricKey_Sessions1`
    FOREIGN KEY (`Sessions_SessionId`)
    REFERENCES `c279`.`Sessions` (`SessionId`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_GroupSessionSymmetricKey_Users1`
    FOREIGN KEY (`Owner_UserId`)
    REFERENCES `c279`.`Users` (`UserId`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
