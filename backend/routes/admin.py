from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from typing import Dict, Any, List
import logging
from services.db import Database
from services.auth import get_current_user
import json
import trimesh
import numpy as np
from pathlib import Path
import hashlib
from datetime import datetime
import io
import csv

# 配置日志
logger = logging.getLogger(__name__)

router = APIRouter()
db = Database()

async def get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    """验证当前用户是否为管理员"""
    if not current_user.get("is_admin"):
        raise HTTPException(
            status_code=403,
            detail="需要管理员权限"
        )
    return current_user

@router.get("/statistics")
async def get_statistics(current_user: dict = Depends(get_admin_user)) -> Dict[str, Any]:
    """获取基础统计数据"""
    try:
        # 获取总用户数
        query = "SELECT COUNT(*) as count FROM users"
        result = await db.fetch_one(query)
        total_users = result["count"]

        # 获取总任务数和任务类型分布
        query = """
            SELECT task_type, COUNT(*) as count
            FROM generation_tasks
            GROUP BY task_type
        """
        tasks = await db.fetch_all(query)
        
        # 计算总任务数和类型分布
        total_tasks = 0
        task_type_counts = {}
        for task in tasks:
            count = task["count"]
            total_tasks += count
            task_type_counts[task["task_type"]] = count

        return {
            "total_users": total_users,
            "total_tasks": total_tasks,
            "task_type_counts": task_type_counts
        }

    except Exception as e:
        logger.error("获取统计数据失败: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e)) 

@router.get("/tasks")
async def get_all_tasks(current_user: dict = Depends(get_admin_user)) -> List[Dict[str, Any]]:
    """获取所有用户的任务列表（包含评估数据）"""
    try:
        query = """
            SELECT 
                t.id,
                t.task_id,
                t.user_id,
                u.username,
                t.task_type,
                t.status,
                t.created_at,
                t.model_urls,
                t.texture_urls,
                t.evaluation_status,
                t.topology_score,
                t.geometry_score,
                t.rendering_score,
                t.evaluation_history
            FROM generation_tasks t
            LEFT JOIN users u ON t.user_id = u.id
            ORDER BY t.created_at DESC
        """
        tasks = await db.fetch_all(query)
        
        # 处理JSON字段
        result = []
        for task in tasks:
            task_dict = dict(task)
            # 解析JSON字段
            for field in ['model_urls', 'texture_urls', 'evaluation_history']:
                if task_dict.get(field):
                    try:
                        task_dict[field] = json.loads(task_dict[field])
                    except:
                        task_dict[field] = None
            result.append(task_dict)
            
        return result

    except Exception as e:
        logger.error("获取任务列表失败: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e)) 

@router.post("/tasks/{task_id}/evaluate")
async def evaluate_task(task_id: str, current_user: dict = Depends(get_admin_user)) -> Dict[str, Any]:
    """评估指定任务的3D模型"""
    try:
        # 获取任务信息
        query = """
            SELECT model_urls
            FROM generation_tasks
            WHERE task_id = %s
        """
        task = await db.fetch_one(query, (task_id,))
        if not task:
            raise HTTPException(status_code=404, detail="任务不存在")

        model_urls = json.loads(task["model_urls"]) if task["model_urls"] else {}
        glb_url = model_urls.get("glb")
        if not glb_url:
            raise HTTPException(status_code=400, detail="模型文件不存在")

        # 获取缓存的模型文件路径
        cache_dir = Path("cache/models")
        cache_key = hashlib.md5(glb_url.encode()).hexdigest()
        model_path = cache_dir / f"{cache_key}.glb"

        if not model_path.exists():
            raise HTTPException(status_code=400, detail="模型文件未缓存")

        # 创建日志捕获器
        log_capture = io.StringIO()
        log_handler = logging.StreamHandler(log_capture)
        logger.addHandler(log_handler)

        try:
            # 加载模型进行评估
            mesh = trimesh.load(str(model_path))
            meshes = [m for m in mesh.geometry.values() if isinstance(m, trimesh.Trimesh)]
            
            if not meshes:
                raise ValueError("没有找到有效的网格")

            # 评估第一个网格（通常只有一个）
            mesh = meshes[0]
            
            # 基础信息
            vertex_count = len(mesh.vertices)
            face_count = len(mesh.faces)
            surface_area = float(mesh.area)
            
            # 1. 法线分布
            normal_consistency = float(np.abs(mesh.face_normals).mean())
            normal_score = round(min(10, normal_consistency * 12), 2)
            
            # 2. 面片质量
            edges = mesh.edges_unique_length
            if len(edges) > 0:
                aspect_ratio = float(np.max(edges) / np.min(edges))
                aspect_score = round(10 * np.exp(-aspect_ratio / 50), 2)
            else:
                aspect_ratio = 0
                aspect_score = 5.0
            
            # 3. 完整性
            is_watertight = bool(mesh.is_watertight)
            is_volume = bool(mesh.is_volume)
            
            edges_unique = mesh.edges_unique
            edge_counts = mesh.edges_unique_length
            boundary_edges = edges_unique[edge_counts == 1]
            boundary_ratio = float(len(boundary_edges) / len(edges_unique)) if len(edges_unique) > 0 else 0
            
            completeness_score = 0
            if is_watertight:
                completeness_score += 3
            if is_volume:
                completeness_score += 2
            if len(boundary_edges) == 0:
                completeness_score += 5
            elif boundary_ratio < 0.1:
                completeness_score += 5
            elif boundary_ratio < 0.2:
                completeness_score += 3
            
            # 4. 细节保留
            vertex_density = float(vertex_count / surface_area) if surface_area > 0 else 0
            detail_score = round(min(10, 2 * np.log10(vertex_density + 1)), 2)
            
            # 最终得分
            final_score = round(
                normal_score * 0.35 +
                aspect_score * 0.15 +
                completeness_score * 0.35 +
                detail_score * 0.15,
                2
            )

            # 保存评估结果到数据库
            evaluation_history = {
                "date": datetime.now().isoformat(),
                "evaluator": "系统自动评估",
                "scores": {
                    "topology": normal_score,
                    "geometry": aspect_score,
                    "rendering": detail_score
                },
                "notes": "自动评估结果"
            }

            # 保存评估详情
            insert_query = """
                INSERT INTO model_evaluations (
                    task_id, vertex_count, face_count, surface_area,
                    normal_consistency, normal_score,
                    aspect_ratio, aspect_score,
                    is_watertight, is_volume, boundary_edges_ratio, completeness_score,
                    vertex_density, detail_score,
                    final_score, evaluation_log
                ) VALUES (
                    %s, %s, %s, %s,
                    %s, %s,
                    %s, %s,
                    %s, %s, %s, %s,
                    %s, %s,
                    %s, %s
                )
            """
            await db.execute(insert_query, (
                task_id, vertex_count, face_count, surface_area,
                normal_consistency, normal_score,
                aspect_ratio, aspect_score,
                is_watertight, is_volume, boundary_ratio, completeness_score,
                vertex_density, detail_score,
                final_score, log_capture.getvalue()
            ))

            # 更新任务表
            update_query = """
                UPDATE generation_tasks
                SET evaluation_status = 'evaluated',
                    topology_score = %s,
                    geometry_score = %s,
                    rendering_score = %s,
                    evaluation_history = COALESCE(
                        JSON_ARRAY_APPEND(
                            COALESCE(evaluation_history, JSON_ARRAY()),
                            '$',
                            %s
                        ),
                        JSON_ARRAY(%s)
                    )
                WHERE task_id = %s
            """
            history_json = json.dumps(evaluation_history)
            await db.execute(update_query, (
                normal_score,
                aspect_score,
                detail_score,
                history_json,
                history_json,
                task_id
            ))

            return {
                "topology_score": normal_score,
                "geometry_score": aspect_score,
                "rendering_score": detail_score,
                "evaluation_history": evaluation_history,
                "details": {
                    "vertex_count": vertex_count,
                    "face_count": face_count,
                    "surface_area": surface_area,
                    "normal_consistency": normal_consistency,
                    "aspect_ratio": aspect_ratio,
                    "is_watertight": is_watertight,
                    "is_volume": is_volume,
                    "boundary_ratio": boundary_ratio,
                    "vertex_density": vertex_density,
                    "final_score": final_score
                }
            }

        finally:
            logger.removeHandler(log_handler)
            log_capture.close()

    except Exception as e:
        logger.error("评估任务失败: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tasks/{task_id}/evaluation")
async def get_evaluation_details(task_id: str, current_user: dict = Depends(get_admin_user)) -> Dict[str, Any]:
    """获取模型评估详情"""
    try:
        query = """
            SELECT *
            FROM model_evaluations
            WHERE task_id = %s
            ORDER BY evaluation_date DESC
            LIMIT 1
        """
        evaluation = await db.fetch_one(query, (task_id,))
        
        if not evaluation:
            raise HTTPException(status_code=404, detail="未找到评估记录")
            
        return {
            "basic_info": {
                "vertex_count": evaluation["vertex_count"],
                "face_count": evaluation["face_count"],
                "surface_area": float(evaluation["surface_area"]),
                "evaluation_date": evaluation["evaluation_date"].isoformat()
            },
            "normal_analysis": {
                "consistency": float(evaluation["normal_consistency"]),
                "score": float(evaluation["normal_score"])
            },
            "mesh_quality": {
                "aspect_ratio": float(evaluation["aspect_ratio"]),
                "score": float(evaluation["aspect_score"])
            },
            "completeness": {
                "is_watertight": evaluation["is_watertight"],
                "is_volume": evaluation["is_volume"],
                "boundary_ratio": float(evaluation["boundary_edges_ratio"]),
                "score": float(evaluation["completeness_score"])
            },
            "detail_preservation": {
                "vertex_density": float(evaluation["vertex_density"]),
                "score": float(evaluation["detail_score"])
            },
            "final_score": float(evaluation["final_score"]),
            "evaluation_log": evaluation["evaluation_log"]
        }

    except Exception as e:
        logger.error("获取评估详情失败: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tasks/export")
async def export_evaluation_report(current_user: dict = Depends(get_admin_user)):
    """导出评估报告"""
    try:
        # 获取所有任务数据
        query = """
            SELECT 
                t.task_id,
                u.username,
                t.task_type,
                t.created_at,
                t.evaluation_status,
                t.topology_score,
                t.geometry_score,
                t.rendering_score,
                t.evaluation_history
            FROM generation_tasks t
            LEFT JOIN users u ON t.user_id = u.id
            ORDER BY t.created_at DESC
        """
        tasks = await db.fetch_all(query)

        # 创建CSV文件
        output = io.StringIO()
        writer = csv.writer(output)
        
        # 写入表头
        writer.writerow([
            '任务ID',
            '用户名',
            '任务类型',
            '创建时间',
            '评估状态',
            '拓扑结构得分',
            '几何准确度得分',
            '渲染效率得分',
            '平均得分',
            '最新评估时间',
            '评估者'
        ])

        # 写入数据
        for task in tasks:
            evaluation_history = json.loads(task['evaluation_history']) if task['evaluation_history'] else []
            latest_evaluation = evaluation_history[-1] if evaluation_history else None
            
            writer.writerow([
                task['task_id'],
                task['username'],
                task['task_type'],
                task['created_at'].strftime('%Y-%m-%d %H:%M:%S'),
                '已评估' if task['evaluation_status'] == 'evaluated' else '待评估',
                f"{task['topology_score']:.1f}" if task['topology_score'] else '-',
                f"{task['geometry_score']:.1f}" if task['geometry_score'] else '-',
                f"{task['rendering_score']:.1f}" if task['rendering_score'] else '-',
                f"{((task['topology_score'] or 0) + (task['geometry_score'] or 0) + (task['rendering_score'] or 0)) / 3:.1f}" if task['evaluation_status'] == 'evaluated' else '-',
                latest_evaluation['date'].split('T')[0] if latest_evaluation else '-',
                latest_evaluation['evaluator'] if latest_evaluation else '-'
            ])

        # 返回CSV文件
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=evaluation_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            }
        )

    except Exception as e:
        logger.error("导出评估报告失败: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))

def evaluate_topology(mesh: trimesh.Scene) -> float:
    """评估模型的拓扑结构质量"""
    try:
        # 获取场景中所有的网格
        meshes = [m for m in mesh.geometry.values() if isinstance(m, trimesh.Trimesh)]
        if not meshes:
            return 5.0  # 如果没有有效的网格，返回中等分数
            
        scores = []
        for mesh in meshes:
            # 1. 检查非流形边缘
            non_manifold_edges = mesh.edges_unique[mesh.edges_unique_length > 2]
            edge_score = max(0, 10 - (len(non_manifold_edges) / len(mesh.edges_unique)) * 100)

            # 2. 检查重叠顶点
            unique_vertices = len(np.unique(mesh.vertices, axis=0))
            vertex_score = unique_vertices / len(mesh.vertices) * 10

            # 3. 检查面片连接性
            watertight_score = 10 if mesh.is_watertight else 7

            # 计算加权平均分
            topology_score = (edge_score * 0.4 + vertex_score * 0.3 + watertight_score * 0.3)
            scores.append(topology_score)

        # 返回所有网格的平均分数
        final_score = sum(scores) / len(scores) if scores else 5.0
        return round(min(max(final_score, 0), 10), 2)

    except Exception as e:
        logger.error("评估拓扑结构失败: %s", str(e))
        return 5.0  # 出错时返回中等分数

def evaluate_geometry(mesh: trimesh.Scene) -> float:
    """评估模型的几何准确度"""
    try:
        # 获取场景中所有的网格
        meshes = [m for m in mesh.geometry.values() if isinstance(m, trimesh.Trimesh)]
        if not meshes:
            logger.info("没有找到有效的网格")
            return 5.0

        scores = []
        for i, mesh in enumerate(meshes):
            logger.info(f"\n评估网格 {i+1}/{len(meshes)}:")
            logger.info(f"网格信息: 顶点数={len(mesh.vertices)}, 面片数={len(mesh.faces)}, 面积={mesh.area:.2f}")

            # 1. 检查法线分布
            normal_consistency = np.abs(mesh.face_normals).mean()
            normal_score = min(10, normal_consistency * 12)
            logger.info(f"法线一致性: {normal_consistency:.3f}, 得分: {normal_score:.2f}")

            # 2. 检查面片质量 - 调整评分曲线
            edges = mesh.edges_unique_length
            if len(edges) > 0:
                aspect_ratios = np.max(edges) / np.min(edges)
                # 使用更宽容的评分曲线
                aspect_score = 10 * np.exp(-aspect_ratios / 50)  # 从10改到50，更宽容
                logger.info(f"边长比: {aspect_ratios:.2f}, 得分: {aspect_score:.2f}")
            else:
                aspect_score = 5.0
                logger.info("无法计算边长比，使用默认分数: 5.0")

            # 3. 检查模型完整性 - 调整评分权重
            completeness_score = 0
            logger.info("完整性检查:")
            
            # 降低流形要求的权重
            if mesh.is_watertight:
                completeness_score += 3  
                logger.info("- 是流形网格 (+3分)")
            else:
                logger.info("- 非流形网格 (+0分)")

            # 降低体积要求的权重
            if mesh.is_volume:
                completeness_score += 2  
                logger.info("- 有合适的体积 (+2分)")
            else:
                logger.info("- 无有效体积 (+0分)")

            edges_unique = mesh.edges_unique
            edge_counts = mesh.edges_unique_length
            boundary_edges = edges_unique[edge_counts == 1]
            
            # 提高闭合性的权重
            if len(boundary_edges) > 0:
                boundary_ratio = len(boundary_edges) / len(edges_unique)
                logger.info(f"- 边界边比例: {boundary_ratio:.3f}")
                if boundary_ratio < 0.1:
                    completeness_score += 5  # 从3分改为5分
                    logger.info("- 边界边较少 (+5分)")
                elif boundary_ratio < 0.2:  # 添加中间档
                    completeness_score += 3
                    logger.info("- 边界边适中 (+3分)")
                else:
                    logger.info("- 边界边过多 (+0分)")
            else:
                completeness_score += 5  # 从3分改为5分
                logger.info("- 完全闭合 (+5分)")
            
            logger.info(f"完整性总分: {completeness_score:.2f}")

            # 4. 检查细节保留度 - 调整评分标准
            if mesh.area > 0:
                vertex_density = len(mesh.vertices) / mesh.area
                # 使用对数尺度评分，避免极端值
                detail_score = min(10, 2 * np.log10(vertex_density + 1))
                logger.info(f"顶点密度: {vertex_density:.3f}, 得分: {detail_score:.2f}")
            else:
                detail_score = 5.0
                logger.info("无法计算顶点密度，使用默认分数: 5.0")

            # 调整权重分配
            geometry_score = (
                normal_score * 0.35 +     # 法线分布（提高权重）
                aspect_score * 0.15 +     # 面片质量（降低权重）
                completeness_score * 0.35 + # 完整性（提高权重）
                detail_score * 0.15       # 细节保留（降低权重）
            )
            logger.info(f"\n各项得分:")
            logger.info(f"- 法线分布 (35%): {normal_score:.2f}")
            logger.info(f"- 面片质量 (15%): {aspect_score:.2f}")
            logger.info(f"- 完整性 (35%): {completeness_score:.2f}")
            logger.info(f"- 细节保留 (15%): {detail_score:.2f}")
            logger.info(f"最终得分: {geometry_score:.2f}\n")
            
            scores.append(geometry_score)

        # 返回所有网格的平均分数
        final_score = sum(scores) / len(scores) if scores else 5.0
        logger.info(f"总体几何评分: {final_score:.2f}")
        return round(min(max(final_score, 0), 10), 2)

    except Exception as e:
        logger.error("评估几何准确度失败: %s", str(e))
        return 5.0  # 出错时返回中等分数

def evaluate_rendering(mesh: trimesh.Scene) -> float:
    """评估模型的渲染效率"""
    try:
        # 获取场景中所有的网格
        meshes = [m for m in mesh.geometry.values() if isinstance(m, trimesh.Trimesh)]
        if not meshes:
            return 5.0

        # 计算总面片数和顶点数
        total_faces = sum(len(m.faces) for m in meshes)
        total_vertices = sum(len(m.vertices) for m in meshes)

        # 1. 评估总面片数量
        face_score = 10 if total_faces < 10000 else (8 if total_faces < 50000 else 6)

        # 2. 评估总顶点数量
        vertex_score = 10 if total_vertices < 5000 else (8 if total_vertices < 25000 else 6)

        # 3. 评估材质和UV（如果有）
        material_score = 8  # 默认分数
        if hasattr(mesh, 'visual') and mesh.visual.material is not None:
            material_score = 9  # 如果有材质，给更高分数

        # 计算加权平均分
        rendering_score = (face_score * 0.4 + vertex_score * 0.4 + material_score * 0.2)
        return round(min(max(rendering_score, 0), 10), 2)

    except Exception as e:
        logger.error("评估渲染效率失败: %s", str(e))
        return 5.0  # 出错时返回中等分数 