import { Request, Response } from "express";
import prisma from "../config/prisma.js";



export async function createApplication(req: Request, res: Response) {
  try {
    const { name, repositoryUrl, branch } = req.body;

    if (!name || !repositoryUrl) {
      return res.status(400).json({
        message: "Application name and repository URL are required",
      });
    }

    const application = await prisma.application.create({
      data: {
        name,
        repositoryUrl,
        branch: branch || "main",
        ownerId: req.userId!,
      },
    });

    return res.status(201).json({
      message: "Application created successfully",
      application,
    });
  } catch (error) {
    console.error("Application creation failed:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}


export async function getApplications(req: Request,res:Response){
    try{
        const applications = await prisma.application.findMany({
            where:{
                ownerId: req.userId!
            },
            orderBy:{
                createdAt: "desc"
            }
        })

        return res.status(200).json({
            applications,
        })

    }catch(error){
        console.log("Failed to fetch applications",error);

        return res.status(500).json({
            message: "Internal server error"
        })
    }
}



export async function getApplicationById(req: Request, res: Response) {
  try {
    const applicationId = Number(req.params.id);

    if (Number.isNaN(applicationId)) {
      return res.status(400).json({
        message: "Invalid application ID",
      });
    }

    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        ownerId: req.userId!,
      },
    });

    if (!application) {
      return res.status(404).json({
        message: "Application not found",
      });
    }

    return res.status(200).json({
      application,
    });
  } catch (error) {
    console.error("Failed to fetch application:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function updateApplication(req:Request, res: Response){
  try{
    const applicationId = Number(req.params.id);
    if(!Number.isInteger(applicationId || applicationId <=0)){
      return res.status(400).json({
        message: "Invalid application ID"
      })
    }

      const {name,repositoryUrl,branch} = req.body;

      if(
        name === undefined && repositoryUrl === undefined 
        && branch === undefined
      ){
        return res.status(400).json({
          message: "Provide at least one field to update"
        })
      }

       const existingApplication = await prisma.application.findFirst({
      where: {
        id: applicationId,
        ownerId: req.userId!,
      },
    });


     if (!existingApplication) {
      return res.status(404).json({
        message: "Application not found",
      });
    }

        const application = await prisma.application.update({
      where: {
        id: applicationId,
      },
      data: {
        ...(name !== undefined && { name }),
        ...(repositoryUrl !== undefined && { repositoryUrl }),
        ...(branch !== undefined && { branch }),
      },
    });

    return res.status(200).json({
      message: "Application updated successfully",
      application,
    });
     



  }catch(error){

    console.error("Application update failed:", error);

    return res.status(500).json({
      message: "Internal server error",
    });

  }
}


export async function deleteApplication(req: Request, res: Response) {
  try {
    const applicationId = Number(req.params.id);

    if (!Number.isInteger(applicationId) || applicationId <= 0) {
      return res.status(400).json({
        message: "Invalid application ID",
      });
    }

    const existingApplication = await prisma.application.findFirst({
      where: {
        id: applicationId,
        ownerId: req.userId!,
      },
    });

    if (!existingApplication) {
      return res.status(404).json({
        message: "Application not found",
      });
    }

    await prisma.application.delete({
      where: {
        id: applicationId,
      },
    });

    return res.status(200).json({
      message: "Application deleted successfully",
    });
  } catch (error) {
    console.error("Application deletion failed:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}
